export type AdapterOperation = "workflow.start" | "step.advance" | "status.reporting";

export type AdapterOperationPayloads = {
  "workflow.start": {
    workflowType: string;
    context: string | null;
  };
  "step.advance": {
    decision: string;
    feedback: string | null;
  };
  "status.reporting": {
    workflows: string[];
    count: number;
  };
};

export type AdapterErrorDetails = {
  message: string;
};

export type AdapterOperationDetails<TOperation extends AdapterOperation = AdapterOperation> = {
  ok: boolean;
  adapter: string;
  operation: TOperation;
  command: string;
  code: number | null;
  stdout: string;
  stderr: string;
  payload: AdapterOperationPayloads[TOperation];
  error: AdapterErrorDetails | null;
};

export type AdapterContractIssue = {
  path: string;
  message: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const hasString = (record: Record<string, unknown>, key: string): boolean => typeof record[key] === "string";

const hasNullableString = (record: Record<string, unknown>, key: string): boolean => {
  return record[key] === null || typeof record[key] === "string";
};

const pushIfMissing = (
  issues: AdapterContractIssue[],
  record: Record<string, unknown>,
  key: string,
  predicate: (input: Record<string, unknown>, field: string) => boolean,
  expected: string
): void => {
  if (!predicate(record, key)) {
    issues.push({ path: `payload.${key}`, message: `Expected ${expected}` });
  }
};

const validatePayload = (operation: AdapterOperation, payload: unknown): AdapterContractIssue[] => {
  if (!isRecord(payload)) {
    return [{ path: "payload", message: "Expected object payload" }];
  }

  const issues: AdapterContractIssue[] = [];
  if (operation === "workflow.start") {
    pushIfMissing(issues, payload, "workflowType", hasString, "string");
    pushIfMissing(issues, payload, "context", hasNullableString, "string|null");
    return issues;
  }

  if (operation === "step.advance") {
    pushIfMissing(issues, payload, "decision", hasString, "string");
    pushIfMissing(issues, payload, "feedback", hasNullableString, "string|null");
    return issues;
  }

  pushIfMissing(
    issues,
    payload,
    "workflows",
    (record, key) => Array.isArray(record[key]) && (record[key] as unknown[]).every((entry) => typeof entry === "string"),
    "string[]"
  );
  pushIfMissing(issues, payload, "count", (record, key) => typeof record[key] === "number", "number");
  return issues;
};

export const buildAdapterSuccessDetails = <TOperation extends AdapterOperation>(input: {
  adapter: string;
  operation: TOperation;
  command: string;
  code: number | null;
  stdout: string;
  stderr: string;
  payload: AdapterOperationPayloads[TOperation];
}): AdapterOperationDetails<TOperation> => ({
  ok: true,
  adapter: input.adapter,
  operation: input.operation,
  command: input.command,
  code: input.code,
  stdout: input.stdout,
  stderr: input.stderr,
  payload: input.payload,
  error: null,
});

export const buildAdapterErrorDetails = <TOperation extends AdapterOperation>(input: {
  adapter: string;
  operation: TOperation;
  command: string;
  code: number | null;
  stdout: string;
  stderr: string;
  payload: AdapterOperationPayloads[TOperation];
  message: string;
}): AdapterOperationDetails<TOperation> => ({
  ok: false,
  adapter: input.adapter,
  operation: input.operation,
  command: input.command,
  code: input.code,
  stdout: input.stdout,
  stderr: input.stderr,
  payload: input.payload,
  error: {
    message: input.message,
  },
});

export const validateAdapterOperationDetails = (details: unknown): AdapterContractIssue[] => {
  if (!isRecord(details)) {
    return [{ path: "details", message: "Expected object" }];
  }

  const issues: AdapterContractIssue[] = [];
  if (typeof details.ok !== "boolean") {
    issues.push({ path: "ok", message: "Expected boolean" });
  }
  if (typeof details.adapter !== "string") {
    issues.push({ path: "adapter", message: "Expected string" });
  }
  if (details.operation !== "workflow.start" && details.operation !== "step.advance" && details.operation !== "status.reporting") {
    issues.push({ path: "operation", message: "Expected supported operation" });
    return issues;
  }
  if (typeof details.command !== "string") {
    issues.push({ path: "command", message: "Expected string" });
  }
  if (!(details.code === null || typeof details.code === "number")) {
    issues.push({ path: "code", message: "Expected number|null" });
  }
  if (typeof details.stdout !== "string") {
    issues.push({ path: "stdout", message: "Expected string" });
  }
  if (typeof details.stderr !== "string") {
    issues.push({ path: "stderr", message: "Expected string" });
  }

  issues.push(...validatePayload(details.operation, details.payload));

  if (details.ok) {
    if (details.error !== null) {
      issues.push({ path: "error", message: "Expected null when ok=true" });
    }
  } else if (!isRecord(details.error) || typeof details.error.message !== "string") {
    issues.push({ path: "error.message", message: "Expected string when ok=false" });
  }

  return issues;
};
