import { snapshotService } from "../services/snapshot.service.js";

const started = Date.now();
const result = snapshotService.refresh();
for (const row of result) {
  const status = row.ok ? "ok" : "failed";
  const suffix = row.error ? ` - ${row.error}` : "";
  console.log(`${status.padEnd(7)} ${String(row.ms).padStart(6)} ms  ${row.key}${suffix}`);
}
const failed = result.filter((row) => !row.ok);
console.log(`Snapshot refresh finished in ${Date.now() - started} ms. ${result.length - failed.length}/${result.length} ok.`);
if (failed.length) process.exitCode = 1;
