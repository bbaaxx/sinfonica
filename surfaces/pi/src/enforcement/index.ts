import { checkToolCallAgainstRules } from "./checker.ts";
import { loadEnforcementRules, type EnforcementRuleDefinition } from "./loader.ts";

type NotifyLevel = "info" | "warning" | "error";

type ToolCallEvent = {
  toolName: string;
  toolCallId: string;
  input: unknown;
};

type ToolCallReturn =
  | { block: true; reason: string }
  | void;

type ExtensionContext = {
  cwd: string;
  ui: {
    notify: (message: string, level?: NotifyLevel) => void;
  };
};

type EnforcementEventApi = {
  on: (
    event: string,
    handler: (event: Record<string, unknown>, ctx?: ExtensionContext) => ToolCallReturn | Promise<ToolCallReturn>
  ) => void;
};

type EnforcementBridgeOptions = {
  cwd?: string;
  notify?: (message: string, level?: NotifyLevel) => void;
};

export type EnforcementBridgeHandle = {
  reload: (cwd?: string) => Promise<number>;
  getRules: () => EnforcementRuleDefinition[];
};

const eventToolName = (event: Record<string, unknown>): string => {
  if (typeof event.toolName === "string" && event.toolName.trim().length > 0) {
    return event.toolName.trim();
  }
  const tool = event.tool as { name?: string } | undefined;
  if (tool && typeof tool.name === "string" && tool.name.trim().length > 0) {
    return tool.name.trim();
  }
  return "";
};

export const registerEnforcementBridge = (
  pi: EnforcementEventApi,
  options: EnforcementBridgeOptions = {}
): EnforcementBridgeHandle => {
  let activeCwd = options.cwd ?? process.cwd();
  let activeRules: EnforcementRuleDefinition[] = [];

  const reload = async (cwd?: string): Promise<number> => {
    activeCwd = cwd ?? activeCwd;
    activeRules = await loadEnforcementRules(activeCwd);
    return activeRules.length;
  };

  void reload(activeCwd).catch(() => undefined);

  pi.on("tool_call", (event, ctx) => {
    const toolName = eventToolName(event);
    if (!toolName) {
      return;
    }

    const check = checkToolCallAgainstRules(
      {
        toolName,
        arguments: event.input ?? event.arguments ?? event.params,
      },
      activeRules
    );

    for (const warning of check.advisory) {
      const message = `[${warning.id}] ${warning.message}`;
      if (ctx?.ui?.notify) {
        ctx.ui.notify(message, "warning");
      } else if (options.notify) {
        options.notify(message, "warning");
      }
    }

    if (check.blocking.length === 0) {
      return;
    }

    const reason = check.blocking.map((item) => `[${item.id}] ${item.message}`).join("; ");
    return { block: true, reason };
  });

  return {
    reload,
    getRules: () => [...activeRules],
  };
};
