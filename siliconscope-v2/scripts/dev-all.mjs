#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const services = [
  {
    name: "backend",
    cwd: "backend",
    args: ["run", "dev"],
    env: { IC_SEEKER_LOCAL_ADMIN: "1" },
  },
  {
    name: "frontend",
    cwd: "frontend",
    args: ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
  },
  {
    name: "admin",
    cwd: "frontend-admin",
    args: ["run", "dev"],
  },
];

const children = new Set();
let shuttingDown = false;

function prefix(name, text) {
  const lines = String(text).split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().length > 0) {
      process.stdout.write(`[${name}] ${line}\n`);
    }
  }
}

console.log("SiliconScope v2 dev launcher");
console.log("Backend:  http://127.0.0.1:8751");
console.log("Frontend: http://127.0.0.1:5173");
console.log("Admin:    http://127.0.0.1:5176");
console.log("Press Ctrl+C to stop all services.\n");

for (const service of services) {
  const child = spawn(npmCmd, service.args, {
    cwd: fileURLToPath(new URL(`../${service.cwd}/`, import.meta.url)),
    env: { ...process.env, ...service.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.add(child);
  child.stdout.on("data", (chunk) => prefix(service.name, chunk));
  child.stderr.on("data", (chunk) => prefix(service.name, chunk));
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (!shuttingDown) {
      console.log(`[${service.name}] exited with code=${code ?? "null"} signal=${signal ?? "null"}`);
      shutdown(code || 1);
    }
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 700).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
