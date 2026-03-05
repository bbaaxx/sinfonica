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

type AdapterErrorDetails = {
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
