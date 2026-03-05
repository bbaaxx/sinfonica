type AdapterOperation = "workflow.start" | "step.advance" | "status.reporting";

type AdapterOperationPayloads = {
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

type AdapterErrorDetails = {
  message: string;
};

type AdapterOperationDetails<TOperation extends AdapterOperation = AdapterOperation> = {
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

const buildAdapterSuccessDetails = <TOperation extends AdapterOperation>(input: {
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

const buildAdapterErrorDetails = <TOperation extends AdapterOperation>(input: {
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

const ADAPTER_ID = "opencode";

export const normalizeOpenCodeOperationSuccess = <TOperation extends AdapterOperation>(input: {
  operation: TOperation;
  command: string;
  code: number | null;
  stdout: string;
  payload: AdapterOperationPayloads[TOperation];
  stderr?: string;
}): AdapterOperationDetails<TOperation> =>
  buildAdapterSuccessDetails({
    adapter: ADAPTER_ID,
    operation: input.operation,
    command: input.command,
    code: input.code,
    stdout: input.stdout,
    stderr: input.stderr ?? "",
    payload: input.payload,
  });

export const normalizeOpenCodeOperationError = <TOperation extends AdapterOperation>(input: {
  operation: TOperation;
  command: string;
  error: string;
  payload: AdapterOperationPayloads[TOperation];
  code?: number | null;
  stdout?: string;
  stderr?: string;
}): AdapterOperationDetails<TOperation> =>
  buildAdapterErrorDetails({
    adapter: ADAPTER_ID,
    operation: input.operation,
    command: input.command,
    code: input.code ?? null,
    stdout: input.stdout ?? "",
    stderr: input.stderr ?? input.error,
    payload: input.payload,
    message: input.error,
  });
