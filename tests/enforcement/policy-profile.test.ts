import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  POLICY_PROFILE_RUNTIME_ENABLED,
  loadPolicyProfile,
  parsePolicyProfile,
} from "../../src/enforcement/policy-profile.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-policy-profile-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("policy profile parser scaffold", () => {
  it("parses a valid policy profile document", () => {
    const profile = parsePolicyProfile([
      "policy_profile_id: baseline-team",
      "extends: default",
      "overrides.ENF-001.enabled: false",
      "overrides.ENF-001.severity: advisory",
      "overrides.ENF-007.enabled: true",
    ].join("\n"));

    expect(profile.policyProfileId).toBe("baseline-team");
    expect(profile.extends).toBe("default");
    expect(profile.overrides["ENF-001"]).toEqual({ enabled: false, severity: "advisory" });
    expect(profile.overrides["ENF-007"]).toEqual({ enabled: true });
  });

  it("rejects unknown override fields", () => {
    const content = [
      "policy_profile_id: baseline-team",
      "overrides.ENF-001.unknown_field: nope",
    ].join("\n");

    expect(() => parsePolicyProfile(content)).toThrow("Unknown override key");
  });

  it("loads profile from file path", async () => {
    const cwd = await makeTempDir();
    await mkdir(join(cwd, ".sinfonia"), { recursive: true });
    const profilePath = join(cwd, ".sinfonia", "policy-profile.yaml");
    await writeFile(profilePath, "policy_profile_id: qa\noverrides.ENF-001.enabled: true\n", "utf8");

    const profile = await loadPolicyProfile(profilePath);
    expect(profile.policyProfileId).toBe("qa");
    expect(profile.overrides["ENF-001"]).toEqual({ enabled: true });
  });

  it("keeps runtime policy profile application disabled by default", () => {
    expect(POLICY_PROFILE_RUNTIME_ENABLED).toBe(false);
  });
});
