import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliDir = resolve(rootDir, "dist/cli");

await mkdir(cliDir, { recursive: true });

const cliJsPath = resolve(cliDir, "index.js");
await writeFile(
  cliJsPath,
  "#!/usr/bin/env node\nimport \"../src/cli/index.js\";\n"
);
await chmod(cliJsPath, 0o755);

await writeFile(
  resolve(cliDir, "index.d.ts"),
  'export * from "../src/cli/index.js";\n'
);
