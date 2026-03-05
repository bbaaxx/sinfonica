import { describe, expect, it } from "vitest";

import { mergeOpenCodeConfig, permissionsToTools, type PersonaToolProfile } from "../src/config.ts";

const TEST_PROFILES: PersonaToolProfile[] = [
  {
    id: "maestro",
    mode: "primary",
    permissions: ["read", "write", "edit", "bash"],
    description: "Orchestrator"
  },
  {
    id: "coda",
    mode: "subagent",
    permissions: ["write", "edit", "bash"],
    description: "Implementation"
  }
];

describe("opencode config helpers", () => {
  it("maps permissions to opencode tool flags", () => {
    expect(permissionsToTools(["read", "bash"]).read).toBe(true);
    expect(permissionsToTools(["read", "bash"]).bash).toBe(true);
    expect(permissionsToTools(["read", "bash"]).write).toBeUndefined();
  });

  it("preserves existing valid agent entries and fills missing ones", () => {
    const current = {
      agent: {
        "sinfonica-maestro": {
          mode: "primary",
          tools: { read: true },
          description: "custom"
        }
      }
    };

    const merged = mergeOpenCodeConfig(current, TEST_PROFILES);
    const agents = merged.agent as Record<string, Record<string, unknown>>;

    expect(merged.$schema).toBe("https://opencode.ai/config.json");
    expect(agents["sinfonica-maestro"].description).toBe("custom");
    expect(agents["sinfonica-coda"].mode).toBe("subagent");
    expect(agents["sinfonica-coda"].tools).toEqual({ write: true, edit: true, bash: true });
  });
});
