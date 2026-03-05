import type { EnforcementRuleDefinition } from "./loader.ts";

export type ToolCallInput = {
  toolName: string;
  arguments?: unknown;
};

export type RuleViolation = {
  id: string;
  severity: "blocking" | "advisory" | "injection";
  pattern: string;
  message: string;
};

export type ToolCallCheckResult = {
  blocking: RuleViolation[];
  advisory: RuleViolation[];
  injection: RuleViolation[];
  injectedContext: string[];
};

const stringifyArgs = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const matchesPattern = (target: string, pattern: string): boolean => {
  try {
    return new RegExp(pattern, "i").test(target);
  } catch {
    return false;
  }
};

export const checkToolCallAgainstRules = (
  toolCall: ToolCallInput,
  rules: EnforcementRuleDefinition[]
): ToolCallCheckResult => {
  const argsTarget = stringifyArgs(toolCall.arguments ?? "");
  const combinedTarget = `${toolCall.toolName} ${argsTarget}`.trim();
  const blocking: RuleViolation[] = [];
  const advisory: RuleViolation[] = [];
  const injection: RuleViolation[] = [];
  const injectedContext: string[] = [];

  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      if (!matchesPattern(toolCall.toolName, pattern) && !matchesPattern(argsTarget, pattern) && !matchesPattern(combinedTarget, pattern)) {
        continue;
      }

      const message = rule.message ?? `Rule ${rule.id} matched tool call ${toolCall.toolName}`;
      const violation: RuleViolation = {
        id: rule.id,
        severity: rule.severity,
        pattern,
        message,
      };

      if (rule.severity === "blocking") {
        blocking.push(violation);
      } else if (rule.severity === "advisory") {
        advisory.push(violation);
      } else {
        injection.push(violation);
        if (rule.inject && !injectedContext.includes(rule.inject)) {
          injectedContext.push(rule.inject);
        }
      }
    }
  }

  return {
    blocking,
    advisory,
    injection,
    injectedContext,
  };
};
