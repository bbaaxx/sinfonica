import { checkToolCallAgainstRules } from "./checker.ts";
import { loadEnforcementRules, type EnforcementRuleDefinition } from "./loader.ts";

type NotifyLevel = "info" | "warning" | "error";

type ToolCallEvent = {
  toolName?: string;
  tool?: { name?: string };
  arguments?: unknown;
  params?: unknown;
  block?: (reason: string) => void;
  preventDefault?: (reason?: string) => void;
  injectContext?: (context: string) => void;
  setContext?: (context: string) => void;
  notify?: (message: string, level?: NotifyLevel) => void;
};

type ToolCallSubscriber = (event: ToolCallEvent) => void | Promise<void>;

type ToolCallEventApi = {
  on?: (event: "tool_call", handler: ToolCallSubscriber) => void;
};

type EnforcementBridgeOptions = {
  cwd?: string;
  notify?: (message: string, level?: NotifyLevel) => void;
};

export type EnforcementBridgeHandle = {
  reload: (cwd?: string) => Promise<number>;
  getRules: () => EnforcementRuleDefinition[];
};

const eventToolName = (event: ToolCallEvent): string => {
  if (typeof event.toolName === "string" && event.toolName.trim().length > 0) {
    return event.toolName.trim();
  }
  if (event.tool && typeof event.tool.name === "string" && event.tool.name.trim().length > 0) {
    return event.tool.name.trim();
  }
  return "";
};

const notifyWithFallback = (
  optionsNotify: EnforcementBridgeOptions["notify"],
  eventNotify: ToolCallEvent["notify"],
  message: string,
  level: NotifyLevel
): void => {
  if (eventNotify) {
    eventNotify(message, level);
    return;
  }
  if (optionsNotify) {
    optionsNotify(message, level);
  }
};

export const registerEnforcementBridge = (
  pi: ToolCallEventApi,
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

  if (pi.on) {
    pi.on("tool_call", async (event) => {
      const toolName = eventToolName(event);
      if (!toolName) {
        return;
      }

      const check = checkToolCallAgainstRules(
        {
          toolName,
          arguments: event.arguments ?? event.params,
        },
        activeRules
      );

      for (const context of check.injectedContext) {
        if (event.injectContext) {
          event.injectContext(context);
        } else if (event.setContext) {
          event.setContext(context);
        }
      }

      for (const warning of check.advisory) {
        notifyWithFallback(options.notify, event.notify, `[${warning.id}] ${warning.message}`, "warning");
      }

      if (check.blocking.length === 0) {
        return;
      }

      const reason = check.blocking.map((item) => `[${item.id}] ${item.message}`).join("; ");
      if (event.block) {
        event.block(reason);
      } else if (event.preventDefault) {
        event.preventDefault(reason);
      }
    });
  }

  return {
    reload,
    getRules: () => [...activeRules],
  };
};
