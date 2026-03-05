import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const readUtf8 = async (relativePath: string): Promise<string> =>
  readFile(join(repoRoot, relativePath), "utf8");

describe("pi extension phase 6 docs and packaging", () => {
  it("documents installation, usage, and troubleshooting in extension README", async () => {
    const readme = await readUtf8("surfaces/pi/README.md");

    expect(readme).toContain("## Installation");
    expect(readme).toContain("## Usage");
    expect(readme).toContain("## Troubleshooting");
    expect(readme).toContain("pi install git:");
    expect(readme).toContain("pi install /absolute/path/to/sinfonica/surfaces/pi");
  });

  it("adds pi integration quick start to root README", async () => {
    const readme = await readUtf8("README.md");

    expect(readme).toContain("## Pi Surface Integration");
    expect(readme).toContain("surfaces/pi/README.md");
    expect(readme).toContain("sinfonica init -y");
    expect(readme).toContain("pi install");
  });

  it("adds pi extension development context in AGENTS guide", async () => {
    const agents = await readUtf8("AGENTS.md");

    expect(agents).toContain("surfaces/pi/");
    expect(agents).toContain("Pi_Surface_Addition.md");
  });

  it("keeps extension package metadata ready for local or git installation", async () => {
    const packageJson = JSON.parse(await readUtf8("surfaces/pi/package.json")) as {
      private?: boolean;
      exports?: Record<string, unknown>;
      files?: string[];
      scripts?: Record<string, string>;
      pi?: { extensions?: string[] };
    };

    expect(packageJson.private).not.toBe(true);
    expect(packageJson.exports?.["."]).toBe("./index.ts");
    expect(packageJson.pi?.extensions).toEqual(["./index.ts"]);
    expect(packageJson.scripts?.build).toContain("tsc");
    expect(packageJson.files).toEqual(expect.arrayContaining(["index.ts", "src/", "README.md", "package.json"]));
  });
});
