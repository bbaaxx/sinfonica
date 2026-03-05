import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

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

const targetArg = process.argv[2];

if (!targetArg) {
  console.error("Usage: node scripts/install-smoke.mjs <adapter-path>");
  process.exit(2);
}

const startedAt = new Date().toISOString();
const targetPath = resolve(process.cwd(), targetArg);
const tempDir = await mkdtemp(join(tmpdir(), "sinfonica-install-smoke-"));

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));

const executeRuntimeProbe = async (installedPackageDir, runtimeProbePath) => {
  const probeSourcePath = resolve(installedPackageDir, runtimeProbePath);
  const probeSource = await readFile(probeSourcePath, "utf8");
  const transpiled = ts.transpileModule(probeSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
    fileName: probeSourcePath,
  });

  const transpiledPath = join(tempDir, "runtime-probe.mjs");
  await writeFile(transpiledPath, transpiled.outputText);
  const namespace = await import(pathToFileURL(transpiledPath).href);

  if (typeof namespace.buildAdapterSuccessDetails === "function") {
    const details = namespace.buildAdapterSuccessDetails({
      adapter: "pi",
      operation: "workflow.start",
      command: "sinfonica start create-prd",
      code: 0,
      stdout: "ok",
      stderr: "",
      payload: {
        workflowType: "create-prd",
        context: null,
      },
    });

    if (!details || details.ok !== true || details.operation !== "workflow.start") {
      throw new Error("Runtime probe returned unexpected pi contract details.");
    }
    return;
  }

  if (typeof namespace.normalizeOpenCodeOperationSuccess === "function") {
    const details = namespace.normalizeOpenCodeOperationSuccess({
      operation: "status.reporting",
      command: "sinfonica list",
      code: 0,
      stdout: "- create-prd",
      payload: {
        workflows: ["create-prd"],
        count: 1,
      },
    });

    if (!details || details.ok !== true || details.operation !== "status.reporting") {
      throw new Error("Runtime probe returned unexpected opencode contract details.");
    }
    return;
  }

  throw new Error(`Unsupported runtime probe exports from ${runtimeProbePath}`);
};

console.log(`[C13][install-smoke] started=${startedAt} target=${targetPath}`);

try {
  const targetPackage = await readJson(join(targetPath, "package.json"));
  const packageName = typeof targetPackage.name === "string" ? targetPackage.name : null;
  const runtimeProbe = targetPackage.sinfonicaSmoke?.runtimeProbe;

  if (!packageName) {
    throw new Error("Adapter package.json must define a name for install smoke checks.");
  }

  if (typeof runtimeProbe !== "string") {
    throw new Error("Adapter package.json must define sinfonicaSmoke.runtimeProbe.");
  }

  const fixturePackageJsonPath = join(tempDir, "package.json");
  await writeFile(
    fixturePackageJsonPath,
    JSON.stringify({
      name: "sinfonica-install-smoke",
      private: true,
      version: "0.0.0",
    })
  );

  await run(
    npmBinary,
    ["install", "--no-audit", "--no-fund", "--ignore-scripts", "--no-package-lock", targetPath],
    tempDir
  );

  const installedPackageDir = join(tempDir, "node_modules", packageName);
  await executeRuntimeProbe(installedPackageDir, runtimeProbe);

  console.log(`[C13][install-smoke] status=pass target=${targetPath}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[C13][install-smoke] status=fail target=${targetPath} error=${message}`);
  process.exitCode = 1;
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
