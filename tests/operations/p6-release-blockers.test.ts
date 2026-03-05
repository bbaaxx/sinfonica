import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const readUtf8 = async (relativePath: string): Promise<string> =>
  readFile(join(repoRoot, relativePath), "utf8");

describe("p6 release blocker remediation", () => {
  it("keeps adapter contract imports self-contained per package", async () => {
    const piIndex = await readUtf8("surfaces/pi/index.ts");
    const opencodeAdapterContract = await readUtf8("surfaces/opencode/src/adapter-contract.ts");

    expect(piIndex).toContain('from "./src/adapter-contract.ts"');
    expect(piIndex).not.toContain('from "../../src/surfaces/adapter-contract.ts"');
    expect(opencodeAdapterContract).not.toContain('from "../../../src/surfaces/adapter-contract.js"');
  });

  it("defines post-install runtime smoke checks for both adapters", async () => {
    const piPackageJson = JSON.parse(await readUtf8("surfaces/pi/package.json")) as {
      sinfonicaSmoke?: { runtimeProbe?: string };
    };
    const opencodePackageJson = JSON.parse(await readUtf8("surfaces/opencode/package.json")) as {
      sinfonicaSmoke?: { runtimeProbe?: string };
    };

    expect(piPackageJson.sinfonicaSmoke?.runtimeProbe).toBe("./src/adapter-contract.ts");
    expect(opencodePackageJson.sinfonicaSmoke?.runtimeProbe).toBe("./src/adapter-contract.ts");
  });
});
