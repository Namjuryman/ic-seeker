import { backupService } from "../services/backup.service.js";

const label = process.argv.slice(2).find((arg) => !arg.startsWith("--")) || "cli";
const keepArg = process.argv.find((arg) => arg.startsWith("--keep="));
const keep = keepArg ? Number(keepArg.split("=")[1]) : process.env.npm_config_keep ? Number(process.env.npm_config_keep) : 14;
if (!Number.isFinite(keep) || keep < 1) {
  throw new Error(`Invalid --keep value: ${keepArg || process.env.npm_config_keep}`);
}

const backup = await backupService.create({ label, actor: "cli" });
console.log(JSON.stringify({
  id: backup.id,
  dbPath: backup.dbPath,
  dbBytes: backup.dbBytes,
  manifestPath: backup.manifestPath,
}, null, 2));

const result = backupService.prune(Math.max(1, Math.floor(Number(keep))));
console.log(JSON.stringify({ pruned: result.deleted, keep: result.keep }, null, 2));
