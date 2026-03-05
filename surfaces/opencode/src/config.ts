export type PersonaToolProfile = {
  id: string;
  mode: "primary" | "subagent";
  permissions: string[];
  description: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

export const permissionsToTools = (permissions: string[]): Record<string, boolean> => {
  const toolNames = ["read", "write", "edit", "bash"] as const;
  return Object.fromEntries(toolNames.filter((tool) => permissions.includes(tool)).map((tool) => [tool, true]));
};

export const mergeOpenCodeConfig = (
  current: Record<string, unknown>,
  profiles: PersonaToolProfile[]
): Record<string, unknown> => {
  const currentAgent = isRecord(current.agent) ? current.agent : {};

  const agent: Record<string, unknown> = {};
  for (const profile of profiles) {
    const key = `sinfonica-${profile.id}`;
    const existing = currentAgent[key];
    if (isRecord(existing) && "mode" in existing && "tools" in existing) {
      agent[key] = existing;
      continue;
    }

    agent[key] = {
      mode: profile.mode,
      tools: permissionsToTools(profile.permissions),
      description: profile.description
    };
  }

  return {
    $schema: "https://opencode.ai/config.json",
    agent
  };
};
