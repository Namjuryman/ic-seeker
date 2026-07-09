import { spawn } from "node:child_process";

const years = [2019,2020,2021,2022,2023,2024,2025,2026];
const venue = "TPEL";

async function run(year: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "node",
      ["./node_modules/tsx/dist/cli.mjs", "src/scripts/backfill-venue.ts", `--venue=${venue}`, `--years=${year}`, "--apply"],
      { cwd: "E:/美好暑假/siliconscope-v2/backend", stdio: "inherit" }
    );
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Exit code ${code} for year ${year}`));
    });
  });
}

(async () => {
  for (const year of years) {
    console.log(`\n=== Starting ${venue} ${year} ===`);
    try {
      await run(year);
    } catch (e) {
      console.error(`Failed ${venue} ${year}:`, e);
    }
  }
  console.log("\n=== All years done ===");
})();
