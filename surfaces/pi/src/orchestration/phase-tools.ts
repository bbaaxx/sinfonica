import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export type WorkflowPhase = "planning" | "implementation" | "review" | "approval";

export type PhaseToolRule = {
  allowed: string[];
  blocked: string[];
};

export type PhaseToolMap = Record<WorkflowPhase, PhaseToolRule>;

export type PhaseToolMapOverride = Partial<Record<WorkflowPhase, PhaseToolRule>>;

export type PhaseToolMapSource =
  | "default:no-config"
  | "default:missing-workflow"
  | "default:read-error"
  | "default:invalid-config"
  | "workflow:custom";

export type PhaseToolMapConfigErrorCode =
  | "PTM-001"
  | "PTM-002"
  | "PTM-003"
  | "PTM-004"
  | "PTM-005"
  | "PTM-006";

export type PhaseToolMapConfigError = {
  code: PhaseToolMapConfigErrorCode;
  message: string;
  workflowId: string;
  filePath?: string;
  phase?: string;
  field?: "allowed" | "blocked";
};

export type PhaseToolMapLoadResult = {
  map: PhaseToolMap;
  source: PhaseToolMapSource;
  cacheHit: boolean;
  warnings: string[];
  error?: PhaseToolMapConfigError;
};

export const DEFAULT_PHASE_TOOL_MAP: PhaseToolMap = {
  planning: {
    allowed: ["Read", "Glob", "Grep", "WebFetch", "sinfonica_*"],
    blocked: ["Write", "Edit", "Bash"],
  },
  implementation: {
    allowed: ["*"],
    blocked: [],
  },
  review: {
    allowed: ["Read", "Glob", "Grep", "Bash", "sinfonica_*"],
    blocked: ["Write", "Edit"],
  },
  approval: {
    allowed: ["Read", "Glob", "sinfonica_advance_step", "sinfonica_list_workflows"],
    blocked: ["Write", "Edit", "Bash"],
  },
};

const PLANNING_SLUGS = ["gather-context", "analyze-prd", "analyze-story", "analyze"];
const REVIEW_SLUGS = ["validate-prd", "validate-spec", "review-code", "review-tests", "assess", "verify"];
const APPROVAL_SLUGS = ["approval", "approve"];
const IMPLEMENTATION_SLUGS = ["draft-prd", "draft-spec", "write-tests", "implement"];
const WORKFLOW_PHASES: WorkflowPhase[] = ["planning", "implementation", "review", "approval"];

const ToolPattern = Type.String({ minLength: 1 });
const PhaseToolRuleOverrideSchema = Type.Object(
  {
    allowed: Type.Optional(Type.Array(ToolPattern)),
    blocked: Type.Optional(Type.Array(ToolPattern)),
  },
  { additionalProperties: false }
);
const PhaseToolMapOverrideSchema = Type.Record(Type.String(), PhaseToolRuleOverrideSchema);

const phaseToolMapCache = new Map<string, Omit<PhaseToolMapLoadResult, "cacheHit">>();

const cloneMap = (map: PhaseToolMap): PhaseToolMap => {
  return {
    planning: {
      allowed: [...map.planning.allowed],
      blocked: [...map.planning.blocked],
    },
    implementation: {
      allowed: [...map.implementation.allowed],
      blocked: [...map.implementation.blocked],
    },
    review: {
      allowed: [...map.review.allowed],
      blocked: [...map.review.blocked],
    },
    approval: {
      allowed: [...map.approval.allowed],
      blocked: [...map.approval.blocked],
    },
  };
};

const cloneLoadResult = (result: Omit<PhaseToolMapLoadResult, "cacheHit">, cacheHit: boolean): PhaseToolMapLoadResult => {
  return {
    map: cloneMap(result.map),
    source: result.source,
    cacheHit,
    warnings: [...result.warnings],
    error: result.error ? { ...result.error } : undefined,
  };
};

const getCacheKey = (cwd: string, workflowId: string): string => `${cwd}::${workflowId}`;

const toWarning = (error: PhaseToolMapConfigError): string => {
  const location = error.filePath ? ` at ${error.filePath}` : "";
  return `[sinfonica:pi:phase-map][${error.code}] ${error.message} in workflow "${error.workflowId}"${location}. Falling back to DEFAULT_PHASE_TOOL_MAP.`;
};

const readFrontmatter = (raw: string): string | undefined => {
  if (!raw.startsWith("---\n")) {
    return undefined;
  }
  const endIndex = raw.indexOf("\n---", 4);
  if (endIndex === -1) {
    return undefined;
  }
  return raw.slice(4, endIndex);
};

const parseInlineList = (value: string): string[] | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return null;
  }
  const inner = trimmed.slice(1, -1).trim();
  if (inner.length === 0) {
    return [];
  }
  return inner
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => item.replace(/^['\"]|['\"]$/g, ""));
};

const countIndent = (line: string): number => {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
};

const parsePhaseToolMapOverrideFromWorkflowDef = (
  raw: string,
  workflowId: string,
  filePath?: string
): { override?: PhaseToolMapOverride; error?: PhaseToolMapConfigError; hasConfig: boolean } => {
  const frontmatter = readFrontmatter(raw);
  if (!frontmatter) {
    return { hasConfig: false };
  }

  const lines = frontmatter.split(/\r?\n/);
  const index = lines.findIndex((line) => /^\s*phase_tool_map:\s*$/.test(line));
  if (index === -1) {
    return { hasConfig: false };
  }

  const rootIndent = countIndent(lines[index]);
  const parsed: Record<string, { allowed?: string[]; blocked?: string[] }> = {};
  let cursor = index + 1;

  while (cursor < lines.length) {
    const line = lines[cursor];
    if (line.trim().length === 0) {
      cursor += 1;
      continue;
    }

    const indent = countIndent(line);
    if (indent <= rootIndent) {
      break;
    }

    const phaseMatch = line.trim().match(/^([a-z][a-z0-9_-]*):\s*$/i);
    if (!phaseMatch) {
      return {
        hasConfig: true,
        error: {
          code: "PTM-005",
          message: "Malformed phase_tool_map block",
          workflowId,
          filePath,
        },
      };
    }

    const phaseKey = phaseMatch[1];
    const phaseIndent = indent;
    parsed[phaseKey] = {};
    cursor += 1;

    while (cursor < lines.length) {
      const phaseLine = lines[cursor];
      if (phaseLine.trim().length === 0) {
        cursor += 1;
        continue;
      }

      const phaseLineIndent = countIndent(phaseLine);
      if (phaseLineIndent <= phaseIndent) {
        break;
      }

      const fieldMatch = phaseLine.trim().match(/^(allowed|blocked):\s*(.*)$/);
      if (!fieldMatch) {
        return {
          hasConfig: true,
          error: {
            code: "PTM-005",
            message: "Malformed phase_tool_map block",
            workflowId,
            filePath,
            phase: phaseKey,
          },
        };
      }

      const field = fieldMatch[1] as "allowed" | "blocked";
      const fieldValue = fieldMatch[2];
      const fieldIndent = phaseLineIndent;
      cursor += 1;

      const inlineList = fieldValue.length > 0 ? parseInlineList(fieldValue) : [];
      if (inlineList === null) {
        return {
          hasConfig: true,
          error: {
            code: "PTM-005",
            message: "Malformed phase_tool_map block",
            workflowId,
            filePath,
            phase: phaseKey,
            field,
          },
        };
      }

      const listValues = [...inlineList];
      while (cursor < lines.length) {
        const listLine = lines[cursor];
        if (listLine.trim().length === 0) {
          cursor += 1;
          continue;
        }
        const listIndent = countIndent(listLine);
        if (listIndent <= fieldIndent) {
          break;
        }

        const itemMatch = listLine.trim().match(/^-\s*(.+)$/);
        if (!itemMatch) {
          return {
            hasConfig: true,
            error: {
              code: "PTM-005",
              message: "Malformed phase_tool_map block",
              workflowId,
              filePath,
              phase: phaseKey,
              field,
            },
          };
        }
        listValues.push(itemMatch[1].trim().replace(/^['\"]|['\"]$/g, ""));
        cursor += 1;
      }

      parsed[phaseKey][field] = listValues;
    }
  }

  return { hasConfig: true, override: parsed as PhaseToolMapOverride };
};

const validatePattern = (
  pattern: unknown,
  workflowId: string,
  phase: string,
  field: "allowed" | "blocked",
  filePath?: string
): PhaseToolMapConfigError | undefined => {
  if (typeof pattern !== "string" || pattern.trim().length === 0) {
    return {
      code: "PTM-003",
      message: `Invalid ${field} pattern. Patterns must be non-empty strings`,
      workflowId,
      filePath,
      phase,
      field,
    };
  }

  const trimmed = pattern.trim();
  if (trimmed === "*") {
    return undefined;
  }
  if (trimmed.includes("*")) {
    if (!trimmed.endsWith("*") || trimmed.slice(0, -1).includes("*")) {
      return {
        code: "PTM-004",
        message: `Unsupported wildcard pattern "${trimmed}". Use exact names, '*' or suffix wildcard like 'sinfonica_*'`,
        workflowId,
        filePath,
        phase,
        field,
      };
    }
    if (trimmed.startsWith("*")) {
      return {
        code: "PTM-004",
        message: `Unsupported wildcard pattern "${trimmed}". Use exact names, '*' or suffix wildcard like 'sinfonica_*'`,
        workflowId,
        filePath,
        phase,
        field,
      };
    }
  }
  return undefined;
};

const validatePhaseToolMapOverride = (
  override: unknown,
  workflowId: string,
  filePath?: string
): PhaseToolMapConfigError | undefined => {
  if (!Value.Check(PhaseToolMapOverrideSchema, override)) {
    return {
      code: "PTM-005",
      message: "Malformed frontmatter phase_tool_map block",
      workflowId,
      filePath,
    };
  }

  for (const [phase, rule] of Object.entries(override as Record<string, Record<string, unknown>>)) {
    if (!WORKFLOW_PHASES.includes(phase as WorkflowPhase)) {
      return {
        code: "PTM-001",
        message: `Invalid phase "${phase}". Use phase keys: planning, implementation, review, approval`,
        workflowId,
        filePath,
        phase,
      };
    }

    if (!Array.isArray(rule.allowed) || !Array.isArray(rule.blocked)) {
      return {
        code: "PTM-002",
        message: `Phase "${phase}" must define both allowed and blocked arrays`,
        workflowId,
        filePath,
        phase,
      };
    }

    for (const pattern of rule.allowed) {
      const error = validatePattern(pattern, workflowId, phase, "allowed", filePath);
      if (error) {
        return error;
      }
    }
    for (const pattern of rule.blocked) {
      const error = validatePattern(pattern, workflowId, phase, "blocked", filePath);
      if (error) {
        return error;
      }
    }
  }

  return undefined;
};

const resolveWorkflowDefinitionPath = async (cwd: string, workflowId: string): Promise<string | null> => {
  const primary = join(cwd, ".sinfonica", "workflows", workflowId, "workflow.md");
  const fallback = join(cwd, "workflows", workflowId, "workflow.md");

  try {
    await readFile(primary, "utf8");
    return primary;
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      try {
        await readFile(fallback, "utf8");
        return fallback;
      } catch (fallbackError: unknown) {
        if (fallbackError instanceof Error && "code" in fallbackError && fallbackError.code === "ENOENT") {
          return null;
        }
        throw fallbackError;
      }
    }
    throw error;
  }
};

const withDefault = (
  source: Exclude<PhaseToolMapSource, "workflow:custom">,
  warnings: string[] = [],
  error?: PhaseToolMapConfigError
): Omit<PhaseToolMapLoadResult, "cacheHit"> => {
  return {
    map: cloneMap(DEFAULT_PHASE_TOOL_MAP),
    source,
    warnings,
    error,
  };
};

export const mergePhaseToolMapOverride = (
  base: PhaseToolMap,
  override: PhaseToolMapOverride
): PhaseToolMap => {
  return {
    planning: override.planning
      ? { allowed: [...override.planning.allowed], blocked: [...override.planning.blocked] }
      : { allowed: [...base.planning.allowed], blocked: [...base.planning.blocked] },
    implementation: override.implementation
      ? { allowed: [...override.implementation.allowed], blocked: [...override.implementation.blocked] }
      : { allowed: [...base.implementation.allowed], blocked: [...base.implementation.blocked] },
    review: override.review
      ? { allowed: [...override.review.allowed], blocked: [...override.review.blocked] }
      : { allowed: [...base.review.allowed], blocked: [...base.review.blocked] },
    approval: override.approval
      ? { allowed: [...override.approval.allowed], blocked: [...override.approval.blocked] }
      : { allowed: [...base.approval.allowed], blocked: [...base.approval.blocked] },
  };
};

export const loadPhaseToolMap = async (cwd: string, workflowId: string): Promise<PhaseToolMapLoadResult> => {
  const cacheKey = getCacheKey(cwd, workflowId);
  const cached = phaseToolMapCache.get(cacheKey);
  if (cached) {
    return cloneLoadResult(cached, true);
  }

  let result: Omit<PhaseToolMapLoadResult, "cacheHit">;

  try {
    const workflowPath = await resolveWorkflowDefinitionPath(cwd, workflowId);
    if (!workflowPath) {
      result = withDefault("default:missing-workflow");
    } else {
      const raw = await readFile(workflowPath, "utf8");
      const parsed = parsePhaseToolMapOverrideFromWorkflowDef(raw, workflowId, workflowPath);

      if (parsed.error) {
        result = withDefault("default:invalid-config", [toWarning(parsed.error)], parsed.error);
      } else if (!parsed.hasConfig || !parsed.override) {
        result = withDefault("default:no-config");
      } else {
        const validationError = validatePhaseToolMapOverride(parsed.override, workflowId, workflowPath);
        if (validationError) {
          result = withDefault("default:invalid-config", [toWarning(validationError)], validationError);
        } else {
          result = {
            map: mergePhaseToolMapOverride(DEFAULT_PHASE_TOOL_MAP, parsed.override),
            source: "workflow:custom",
            warnings: [],
          };
        }
      }
    }
  } catch (error: unknown) {
    const configError: PhaseToolMapConfigError = {
      code: "PTM-006",
      message: `Workflow definition is unreadable: ${error instanceof Error ? error.message : String(error)}`,
      workflowId,
    };
    result = withDefault("default:read-error", [toWarning(configError)], configError);
  }

  phaseToolMapCache.set(cacheKey, result);
  return cloneLoadResult(result, false);
};

export const clearPhaseToolMapCache = (): void => {
  phaseToolMapCache.clear();
};

export const resolvePhaseFromStep = (
  stepSlug: string,
  stepIndex: number,
  totalSteps: number
): WorkflowPhase => {
  const normalized = stepSlug.toLowerCase().replace(/^\d+-/, "");

  if (APPROVAL_SLUGS.some((slug) => normalized.includes(slug))) {
    return "approval";
  }
  if (REVIEW_SLUGS.some((slug) => normalized.includes(slug))) {
    return "review";
  }
  if (IMPLEMENTATION_SLUGS.some((slug) => normalized.includes(slug))) {
    return "implementation";
  }
  if (PLANNING_SLUGS.some((slug) => normalized.includes(slug))) {
    return "planning";
  }

  if (stepIndex <= 1) {
    return "planning";
  }
  if (stepIndex >= totalSteps) {
    return "approval";
  }
  return "implementation";
};

const matchesToolPattern = (toolName: string, pattern: string): boolean => {
  if (pattern === "*") {
    return true;
  }
  if (pattern.endsWith("*")) {
    return toolName.toLowerCase().startsWith(pattern.slice(0, -1).toLowerCase());
  }
  return toolName.toLowerCase() === pattern.toLowerCase();
};

export const isToolAllowedInPhase = (
  toolName: string,
  phase: WorkflowPhase,
  phaseToolMap: PhaseToolMap = DEFAULT_PHASE_TOOL_MAP
): boolean => {
  const config = phaseToolMap[phase];

  if (config.blocked.some((pattern) => matchesToolPattern(toolName, pattern))) {
    return false;
  }

  return config.allowed.some((pattern) => matchesToolPattern(toolName, pattern));
};

export const computeAllowedTools = (
  currentPhase: WorkflowPhase,
  allTools: Array<{ name: string }>,
  phaseToolMap: PhaseToolMap = DEFAULT_PHASE_TOOL_MAP
): string[] => {
  return allTools
    .map((tool) => tool.name)
    .filter((name) => isToolAllowedInPhase(name, currentPhase, phaseToolMap));
};
