import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const envPath = process.argv[2] ? path.resolve(root, process.argv[2]) : path.resolve(root, ".env.production");

function parseEnv(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

function exists(relativePath) {
  return fs.existsSync(path.resolve(root, relativePath));
}

function runEnvCheck() {
  const result = spawnSync(process.execPath, ["scripts/check-production-env.mjs", envPath], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  return result.status === 0;
}

async function resolveHost(hostname) {
  if (!hostname || hostname.includes("example") || hostname.includes("your-domain")) return "placeholder";
  try {
    const [a, aaaa, cname] = await Promise.allSettled([
      dns.resolve4(hostname),
      dns.resolve6(hostname),
      dns.resolveCname(hostname),
    ]);
    const addresses = [
      ...(a.status === "fulfilled" ? a.value : []),
      ...(aaaa.status === "fulfilled" ? aaaa.value : []),
      ...(cname.status === "fulfilled" ? cname.value : []),
    ];
    return addresses.length ? addresses.join(", ") : "not resolved";
  } catch {
    return "not resolved";
  }
}

if (!fs.existsSync(envPath)) {
  console.error(`Missing env file: ${envPath}`);
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));
let ok = runEnvCheck();

const requiredFiles = [
  "docker-compose.production.yml",
  "Dockerfile",
  "deploy/Caddyfile.docker",
  "frontend/dist/index.html",
  "frontend-admin/dist/index.html",
];

for (const file of requiredFiles) {
  if (exists(file)) {
    console.log(`OK    ${file}`);
  } else {
    console.error(`ERROR ${file} is missing. Run npm run build before deploying.`);
    ok = false;
  }
}

const domains = [
  ["PUBLIC_DOMAIN", env.PUBLIC_DOMAIN],
  ["WWW_DOMAIN", env.WWW_DOMAIN],
  ["ADMIN_DOMAIN", env.ADMIN_DOMAIN],
  ["API_DOMAIN", env.API_DOMAIN],
];

for (const [key, host] of domains) {
  const result = await resolveHost(host);
  if (result === "placeholder" || result === "not resolved") {
    console.warn(`WARN  ${key}=${host || "(empty)"} -> ${result}`);
  } else {
    console.log(`OK    ${key}=${host} -> ${result}`);
  }
}

if (!ok) process.exit(1);

console.log("Deploy doctor finished. DNS warnings are acceptable before records propagate.");
