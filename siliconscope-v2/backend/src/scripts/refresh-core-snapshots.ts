import { snapshotService } from "../services/snapshot.service.js";

const keys = [
  "profiles:professors:top80",
  "profiles:institutions:top80",
  "topics:list",
  "geo:overall",
  "venue-matrix",
  "mentor:institutions",
];

const started = Date.now();
const result = snapshotService.refresh(keys);
for (const row of result) {
  const status = row.ok ? "ok" : "failed";
  const suffix = row.error ? ` - ${row.error}` : "";
  console.log(`${status.padEnd(7)} ${String(row.ms).padStart(6)} ms  ${row.key}${suffix}`);
}
const failed = result.filter((row) => !row.ok);
console.log(`Core snapshot refresh finished in ${Date.now() - started} ms. ${result.length - failed.length}/${result.length} ok.`);
if (failed.length) process.exitCode = 1;
