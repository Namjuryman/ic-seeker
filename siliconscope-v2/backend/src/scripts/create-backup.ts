import { backupService } from "../services/backup.service.js";

const label = process.argv[2] || "cli";
const keepArg = process.argv.find((arg) => arg.startsWith("--keep="));
const keep = keepArg ? Number(keepArg.split("=")[1]) : process.env.npm_config_keep ? Number(process.env.npm_config_keep) : null;

const backup = await backupService.create({ label, actor: "cli" });
console.log(JSON.stringify({
  id: backup.id,
  dbPath: backup.dbPath,
  dbBytes: backup.dbBytes,
  manifestPath: backup.manifestPath,
}, null, 2));

if (Number.isFinite(keep) && keep !== null) {
  const result = backupService.prune(Math.max(1, Number(keep)));
  console.log(JSON.stringify({ pruned: result.deleted, keep: result.keep }, null, 2));
}
