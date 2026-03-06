export type StepEvidence = {
  executed: boolean;
  stepId: string;
  persona: string;
  artifacts: string[];
  resultStatus: "success" | "partial" | "failed";
};

export type EvidenceValidationResult = {
  valid: boolean;
  missing: string[];
};

const REQUIRED_EVIDENCE_FIELDS = ["executed", "stepId"];

export const validateStepEvidence = (
  evidence: unknown,
  requiredFields: string[] = REQUIRED_EVIDENCE_FIELDS
): EvidenceValidationResult => {
  if (!evidence || typeof evidence !== "object") {
    return { valid: false, missing: requiredFields };
  }

  const record = evidence as Record<string, unknown>;
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (field === "executed") {
      if (record.executed !== true) {
        missing.push(field);
      }
    } else if (!(field in record) || record[field] === undefined || record[field] === null || record[field] === "") {
      missing.push(field);
    }
  }

  return { valid: missing.length === 0, missing };
};

export const extractEvidenceFromToolResult = (
  details: Record<string, unknown>
): Partial<StepEvidence> => {
  const evidence: Partial<StepEvidence> = {};

  if (details.sinfonica_evidence && typeof details.sinfonica_evidence === "object") {
    return details.sinfonica_evidence as Partial<StepEvidence>;
  }

  if (details.ok === true) {
    evidence.executed = true;
  }

  if (typeof details.stepId === "string") {
    evidence.stepId = details.stepId;
  }

  if (typeof details.persona === "string") {
    evidence.persona = details.persona;
  }

  if (Array.isArray(details.artifacts)) {
    evidence.artifacts = details.artifacts.filter((item): item is string => typeof item === "string");
  }

  if (typeof details.resultStatus === "string" && ["success", "partial", "failed"].includes(details.resultStatus)) {
    evidence.resultStatus = details.resultStatus as StepEvidence["resultStatus"];
  } else if (details.ok === true) {
    evidence.resultStatus = "success";
  }

  return evidence;
};
