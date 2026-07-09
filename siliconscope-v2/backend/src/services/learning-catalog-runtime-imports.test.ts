import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const servicesDir = dirname(fileURLToPath(import.meta.url));

function serviceSources() {
  return readdirSync(servicesDir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => ({
      name,
      source: readFileSync(join(servicesDir, name), "utf8"),
    }));
}

describe("learning catalog runtime imports", () => {
  it("keeps runtime services behind the learning content source", () => {
    const offenders = serviceSources()
      .filter(({ name }) => name !== "learning-content.service.ts")
      .flatMap(({ name, source }) => {
        const problems: string[] = [];
        if (source.includes("../data/learning-catalog.js")) {
          problems.push(`${name} imports the legacy learning catalog`);
        }
        if (/import\s+(?!type\b)[\s\S]*?from\s+["']\.\.\/data\/learning-catalog-v3\.js["']/.test(source)) {
          problems.push(`${name} value-imports the seed learning catalog`);
        }
        return problems;
      });

    expect(offenders).toEqual([]);
  });
});
