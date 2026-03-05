import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliDir = resolve(rootDir, "dist/cli");

await mkdir(cliDir, { recursive: true });

await writeFile(
  resolve(cliDir, "index.js"),
  "#!/usr/bin/env node\nimport \"../src/cli/index.js\";\n"
);

await writeFile(
  resolve(cliDir, "index.d.ts"),
  'export * from "../src/cli/index.js";\n'
);
