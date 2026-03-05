import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const readUtf8 = async (relativePath: string): Promise<string> =>
  readFile(join(repoRoot, relativePath), "utf8");

describe("p4 release gates and matrix", () => {
  it("defines reproducible matrix and smoke check scripts", async () => {
    const packageJson = JSON.parse(await readUtf8("package.json")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["check:core"]).toBe("npm run build && npm test");
    expect(packageJson.scripts?.["check:surface:pi"]).toBe(
      "npm run build --prefix surfaces/pi && npm test -- surfaces/pi/tests"
    );
    expect(packageJson.scripts?.["check:surface:opencode"]).toBe(
      "npm run build --prefix surfaces/opencode && npm test -- surfaces/opencode/tests"
    );
    expect(packageJson.scripts?.["check:smoke:install:pi"]).toBe(
      "node scripts/install-smoke.mjs surfaces/pi"
    );
    expect(packageJson.scripts?.["check:smoke:install:opencode"]).toBe(
      "node scripts/install-smoke.mjs surfaces/opencode"
    );
    expect(packageJson.scripts?.["check:entrypoints"]).toBe("node scripts/check-entrypoints.mjs");
    expect(packageJson.scripts?.["check:entrypoints:clean"]).toBe(
      "node scripts/check-entrypoints.mjs --clean-build"
    );
  });

  it("keeps declared package entrypoints aligned with emitted cli artifacts", async () => {
    const packageJson = JSON.parse(await readUtf8("package.json")) as {
      main?: string;
      types?: string;
      bin?: Record<string, string>;
    };

    expect(packageJson.main).toBe("dist/cli/index.js");
    expect(packageJson.types).toBe("dist/cli/index.d.ts");
    expect(packageJson.bin?.sinfonica).toBe("dist/cli/index.js");
  });

  it("documents C11 to C13 with required and optional labels", async () => {
    const matrixDoc = await readUtf8("docs/operations/p4-release-validation-matrix.md");

    expect(matrixDoc).toContain("C11");
    expect(matrixDoc).toContain("C12");
    expect(matrixDoc).toContain("C13");
    expect(matrixDoc).toContain("Required checks");
    expect(matrixDoc).toContain("Optional checks");
    expect(matrixDoc).toContain("npm run check:core");
    expect(matrixDoc).toContain("npm run check:surface:pi");
    expect(matrixDoc).toContain("npm run check:surface:opencode");
    expect(matrixDoc).toContain("npm run check:smoke:install:pi");
    expect(matrixDoc).toContain("npm run check:smoke:install:opencode");
  });
});
