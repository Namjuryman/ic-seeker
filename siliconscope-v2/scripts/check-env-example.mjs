import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envExamplePath = path.join(rootDir, ".env.example");
const scanRoots = [
  path.join(rootDir, "backend", "src"),
  path.join(rootDir, "scripts"),
];

const ignoredRuntimeKeys = new Set([
  "VITEST",
  "npm_config_keep",
]);

const envDotPattern = /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g;
const envBracketPattern = /process\.env\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g;
const envExamplePattern = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["dist", "node_modules", ".vite"].includes(entry.name)) return [];
      return walk(absolutePath);
    }
    if (!/\.(mjs|cjs|js|ts|tsx)$/.test(entry.name)) return [];
    return [absolutePath];
  });
}

function collectProcessEnvKeys() {
  const keys = new Map();
  for (const filePath of scanRoots.flatMap(walk)) {
    const source = fs.readFileSync(filePath, "utf8");
    for (const pattern of [envDotPattern, envBracketPattern]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(source))) {
        const key = match[1];
        if (ignoredRuntimeKeys.has(key)) continue;
        if (!keys.has(key)) keys.set(key, new Set());
        keys.get(key).add(path.relative(rootDir, filePath).replaceAll(path.sep, "/"));
      }
    }
  }
  return keys;
}

function collectExampleKeys() {
  if (!fs.existsSync(envExamplePath)) {
    throw new Error(`Missing .env.example at ${envExamplePath}`);
  }
  return new Set(
    fs.readFileSync(envExamplePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(envExamplePattern)?.[1])
      .filter(Boolean),
  );
}

const codeKeys = collectProcessEnvKeys();
const exampleKeys = collectExampleKeys();
const missing = [...codeKeys.keys()].filter((key) => !exampleKeys.has(key)).sort();
const unused = [...exampleKeys].filter((key) => !codeKeys.has(key) && !key.startsWith("VITE_")).sort();

if (missing.length > 0) {
  console.error("Missing .env.example entries for process.env keys:");
  for (const key of missing) {
    console.error(`- ${key}: ${[...codeKeys.get(key)].join(", ")}`);
  }
  process.exit(1);
}

console.log(`.env.example covers ${codeKeys.size} process.env keys.`);
if (unused.length > 0) {
  console.log(`Extra documented keys without direct process.env usage: ${unused.join(", ")}`);
}
