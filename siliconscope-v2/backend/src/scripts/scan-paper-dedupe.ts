import { sqlite } from "../db/connection.js";
import { paperDedupeService } from "../services/paper-dedupe.service.js";

function readNumberFlag(name: string, fallback: number) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  if (!arg) return fallback;
  const value = Number(arg.slice(prefix.length));
  return Number.isFinite(value) ? value : fallback;
}

const persist = !process.argv.includes("--dry-run") && !process.argv.includes("--no-persist");
const limit = readNumberFlag("limit", 200);

const result = paperDedupeService.scan({ limit, persist });
console.log(JSON.stringify(result, null, 2));
sqlite.close();
