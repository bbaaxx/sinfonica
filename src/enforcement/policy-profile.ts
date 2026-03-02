import { readFile } from "node:fs/promises";

import type { EnforcementSeverity } from "./registry.js";

export const POLICY_PROFILE_RUNTIME_ENABLED = false;

export interface PolicyProfileOverride {
  enabled?: boolean;
  severity?: EnforcementSeverity;
}

export interface PolicyProfile {
  policyProfileId: string;
  extends?: string;
  overrides: Record<string, PolicyProfileOverride>;
}

const ALLOWED_SEVERITIES: EnforcementSeverity[] = ["blocking", "advisory", "injection"];

const parseScalar = (value: string): string | boolean => {
  const trimmed = value.trim();
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

export const parsePolicyProfile = (content: string): PolicyProfile => {
  const overrides: Record<string, PolicyProfileOverride> = {};
  let policyProfileId: string | undefined;
  let parent: string | undefined;

  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf(":");
    if (separator <= 0) {
      throw new Error(`Invalid YAML in policy profile at line ${index + 1}`);
    }

    const key = trimmed.slice(0, separator).trim();
    const parsedValue = parseScalar(trimmed.slice(separator + 1));

    if (key === "policy_profile_id") {
      if (typeof parsedValue !== "string" || parsedValue.length === 0) {
        throw new Error("policy_profile_id must be a non-empty string");
      }
      policyProfileId = parsedValue;
      continue;
    }

    if (key === "extends") {
      if (typeof parsedValue !== "string" || parsedValue.length === 0) {
        throw new Error("extends must be a non-empty string when provided");
      }
      parent = parsedValue;
      continue;
    }

    const overrideMatch = key.match(/^overrides\.([A-Za-z0-9-]+)\.(enabled|severity)$/);
    if (!overrideMatch) {
      throw new Error(`Unknown override key: ${key}`);
    }

    const [, ruleId, field] = overrideMatch;
    const current = overrides[ruleId] ?? {};

    if (field === "enabled") {
      if (typeof parsedValue !== "boolean") {
        throw new Error(`overrides.${ruleId}.enabled must be a boolean`);
      }
      current.enabled = parsedValue;
    } else {
      if (typeof parsedValue !== "string" || !ALLOWED_SEVERITIES.includes(parsedValue as EnforcementSeverity)) {
        throw new Error(`overrides.${ruleId}.severity must be one of ${ALLOWED_SEVERITIES.join(", ")}`);
      }
      current.severity = parsedValue as EnforcementSeverity;
    }

    overrides[ruleId] = current;
  }

  if (!policyProfileId) {
    throw new Error("Missing required key: policy_profile_id");
  }

  return {
    policyProfileId,
    extends: parent,
    overrides,
  };
};

export const loadPolicyProfile = async (filePath: string): Promise<PolicyProfile> => {
  const content = await readFile(filePath, "utf8");
  return parsePolicyProfile(content);
};
