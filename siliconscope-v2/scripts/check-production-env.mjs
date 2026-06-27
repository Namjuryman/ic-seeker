import fs from "node:fs";
import path from "node:path";

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

function isBlank(value) {
  return !value || value.includes("replace-with") || value.includes("your-domain.com");
}

function readPositiveInt(key, fallback) {
  const value = Number(env[key] || fallback);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

if (!fs.existsSync(envPath)) {
  console.error(`Missing env file: ${envPath}`);
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));
const errors = [];
const warnings = [];

for (const key of ["PUBLIC_SITE_URL", "ADMIN_SITE_URL", "API_BASE_URL", "FRONTEND_ORIGINS"]) {
  if (isBlank(env[key])) errors.push(`${key} must be set to your real production value.`);
}

for (const key of ["PUBLIC_DOMAIN", "WWW_DOMAIN", "ADMIN_DOMAIN", "API_DOMAIN"]) {
  if (isBlank(env[key])) warnings.push(`${key} is not set. Docker+Caddy one-VPS deployment needs it.`);
}

if (isBlank(env.JWT_SECRET) || env.JWT_SECRET.length < 32) {
  errors.push("JWT_SECRET must be a real random value with at least 32 characters.");
}

if (isBlank(env.ADMIN_PASSWORD) || env.ADMIN_PASSWORD.length < 16) {
  errors.push("ADMIN_PASSWORD must be a real strong password with at least 16 characters.");
}

if (env.IC_SEEKER_REQUIRE_LOGIN !== "1") {
  errors.push("IC_SEEKER_REQUIRE_LOGIN must be 1 in production.");
}

if (env.IC_SEEKER_LOCAL_ADMIN === "1") {
  errors.push("IC_SEEKER_LOCAL_ADMIN must be 0 or unset in production.");
}

if (env.RATE_LIMIT_ENABLED === "0") {
  errors.push("RATE_LIMIT_ENABLED must not be 0 in production.");
}

const generalLimit = readPositiveInt("RATE_LIMIT_MAX", 400);
const authLimit = readPositiveInt("AUTH_RATE_LIMIT_MAX", 8);
const adminLimit = readPositiveInt("ADMIN_RATE_LIMIT_MAX", 120);

if (!generalLimit || !authLimit || !adminLimit) {
  errors.push("RATE_LIMIT_MAX, AUTH_RATE_LIMIT_MAX, and ADMIN_RATE_LIMIT_MAX must be positive numbers.");
}

if (authLimit > 20) {
  warnings.push("AUTH_RATE_LIMIT_MAX is high for a public login endpoint.");
}

if (adminLimit > generalLimit) {
  warnings.push("ADMIN_RATE_LIMIT_MAX is higher than RATE_LIMIT_MAX; admin operations usually need a stricter limit.");
}

if (env.TRUST_PROXY !== "1") {
  warnings.push("TRUST_PROXY should be 1 when running behind Caddy, Nginx, Cloudflare, or a load balancer.");
}

if (!env.FRONTEND_ORIGINS?.includes(env.PUBLIC_SITE_URL)) {
  warnings.push("FRONTEND_ORIGINS does not include PUBLIC_SITE_URL.");
}

if (!env.FRONTEND_ORIGINS?.includes(env.ADMIN_SITE_URL)) {
  warnings.push("FRONTEND_ORIGINS does not include ADMIN_SITE_URL.");
}

if (!env.SENTRY_DSN) warnings.push("SENTRY_DSN is empty; production error reporting is not wired yet.");
if (!env.REDIS_URL) warnings.push("REDIS_URL is empty; rate limits and queues are single-process fallback.");
if (!env.POSTGRES_URL) warnings.push("POSTGRES_URL is empty; this is still SQLite/private-edition storage.");

console.log(`Checked ${envPath}`);

for (const warning of warnings) console.warn(`WARN  ${warning}`);

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log("Production env looks deployable.");
