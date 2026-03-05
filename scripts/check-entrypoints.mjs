import { spawn } from "node:child_process";
import { access, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = resolve(ROOT_DIR, "package.json");
const shouldCleanBuild = process.argv.includes("--clean-build");
const npmBinary = process.platform === "win32" ? "npm.cmd" : "npm";

const run = (command, args, cwd) =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("close", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(new Error(`Command failed with exit code ${code}: ${command} ${args.join(" ")}`));
    });
  });

const toPaths = (value) => {
  if (typeof value === "string") {
    return [value];
  }

  if (value && typeof value === "object") {
    return Object.values(value).filter((entry) => typeof entry === "string");
  }

  return [];
};

const verify = async () => {
  if (shouldCleanBuild) {
    await rm(resolve(ROOT_DIR, "dist"), { recursive: true, force: true });
    await run(npmBinary, ["run", "build"], ROOT_DIR);
  }

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const declaredEntrypoints = [
    ...toPaths(packageJson.main),
    ...toPaths(packageJson.types),
    ...toPaths(packageJson.bin),
  ];
  const uniqueEntrypoints = [...new Set(declaredEntrypoints)];

  for (const entrypoint of uniqueEntrypoints) {
    const absolutePath = resolve(ROOT_DIR, entrypoint);
    try {
      await access(absolutePath);
      console.log(`[entrypoints] ok ${entrypoint}`);
    } catch {
      throw new Error(`Declared entrypoint missing after build: ${entrypoint}`);
    }
  }
};

try {
  await verify();
  console.log(`[entrypoints] status=pass clean_build=${shouldCleanBuild}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[entrypoints] status=fail clean_build=${shouldCleanBuild} error=${message}`);
  process.exitCode = 1;
}
