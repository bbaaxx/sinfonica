export type WorkflowMetricName = "approval_outcome" | "failure_action" | "resume_result" | "run_outcome";

export interface WorkflowMetricEvent {
  name: WorkflowMetricName;
  sessionId: string;
  outcome: string;
  workflowName?: string;
  timestamp: string;
}

const events: WorkflowMetricEvent[] = [];

export const emitWorkflowMetric = (
  event: Omit<WorkflowMetricEvent, "timestamp">
): WorkflowMetricEvent => {
  const recorded: WorkflowMetricEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  events.push(recorded);
  return recorded;
};

export const getWorkflowMetricsEvents = (): WorkflowMetricEvent[] => [...events];

export const clearWorkflowMetricsEvents = (): void => {
  events.length = 0;
};
