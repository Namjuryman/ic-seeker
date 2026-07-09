import { afterEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { appConfig } from "./config.js";
import { appSqlite } from "./db/app-db.js";
import { requireAdmin, requireAuth, type AuthenticatedRequest } from "./middleware/auth.js";
import { paperCitation } from "./services/export-format-utils.js";
import { ftsQuery, semanticText } from "./services/search-query-utils.js";
import { mergePapers } from "./scripts/paper-import/merge.js";
import { fetchCrossref } from "./scripts/paper-import/sources.js";
import { upsertPapers } from "./scripts/paper-import/upsert.js";
import type { ImportedPaper } from "./scripts/paper-import/types.js";
import { createTestSqlite, searchSeededPapers, seedPapers } from "./test-utils/seed.js";

function mockResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function withAuthConfig<T>(values: Partial<typeof appConfig>, run: () => T): T {
  const original = Object.fromEntries(Object.keys(values).map((key) => [key, (appConfig as any)[key]]));
  Object.assign(appConfig as any, values);
  try {
    return run();
  } finally {
    Object.assign(appConfig as any, original);
  }
}

const paper = {
  title: "A 95% Efficient Hybrid DC-DC Converter",
  authors: "Ada Lovelace; Grace Hopper",
  year: 2025,
  venue: "IEEE Journal of Solid-State Circuits",
  doi: "10.1109/jssc.2025.123456",
};

describe("core search and import integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds weighted FTS hits, expands Chinese aliases, and preserves empty-query filters", () => {
    const sqlite = createTestSqlite();
    seedPapers(sqlite, [
      {
        title: "A SAR ADC With Digital Calibration",
        abstract: "A compact converter for sensor interfaces.",
        year: 2024,
        venue: "JSSC",
        venueRank: "S+",
        domain: "Analog & Mixed-Signal",
        qualityScore: 100,
      },
      {
        title: "A Low-Power Sensor Interface",
        abstract: "This interface integrates a SAR ADC and a reference.",
        year: 2023,
        venue: "ISSCC",
        venueRank: "S+",
        domain: "Analog & Mixed-Signal",
        qualityScore: 95,
      },
      {
        title: "A Bandgap Reference",
        abstract: "Voltage reference circuit.",
        year: 2021,
        venue: "CICC",
        venueRank: "S",
        domain: "Power Management",
        qualityScore: 80,
      },
      {
        title: "A Hidden Broad Physics Paper",
        abstract: "Not part of public search.",
        year: 2024,
        venue: "Nature Communications",
        venueRank: "Hidden",
        domain: "General IC",
        qualityScore: 999,
      },
    ]);

    expect(ftsQuery("SAR ADC")).toBe("sar* AND adc*");
    expect(semanticText("模数转换器")).toContain("analog to digital");

    const hits = searchSeededPapers(sqlite, { q: "SAR ADC", sort: "relevance" });
    expect(hits.map((row) => row.title)).toEqual([
      "A SAR ADC With Digital Calibration",
      "A Low-Power Sensor Interface",
    ]);

    const aliasHits = searchSeededPapers(sqlite, { q: "模数转换器", semantic: true });
    expect(aliasHits.map((row) => row.title)).toContain("A SAR ADC With Digital Calibration");

    const filtered = searchSeededPapers(sqlite, { venue: "JSSC", yearFrom: 2024, yearTo: 2026 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].venue).toBe("JSSC");
  });

  it("merges DOI, OpenAlex, and title-year duplicates, then syncs FTS rows", () => {
    const sqlite = createTestSqlite();
    const imported: ImportedPaper[] = [
      {
        source: "crossref",
        sourceId: "10.1109/test.1",
        title: "A DC-DC Converter",
        authors: ["Ada"],
        abstract: "short",
        year: 2025,
        venue: "JSSC",
        doi: "10.1109/test.1",
      },
      {
        source: "openalex",
        sourceId: "W1",
        title: "A DC-DC Converter With Longer Verified Abstract",
        authors: ["Ada", "Grace"],
        abstract: "longer abstract with buck converter and pmic details",
        year: 2025,
        venue: "JSSC",
        doi: "10.1109/test.1",
        openalexId: "https://openalex.org/W1",
      },
      {
        source: "openalex",
        sourceId: "W2",
        title: "An RF Front-End",
        year: 2024,
        venue: "ISSCC",
        openalexId: "https://openalex.org/W2",
      },
      {
        source: "semantic-scholar",
        sourceId: "S2",
        title: "An RF Front-End Updated",
        year: 2024,
        venue: "ISSCC",
        openalexId: "https://openalex.org/W2",
      },
      {
        source: "dblp",
        title: "A PLL for Low-Jitter Clocking",
        year: 2022,
        venue: "CICC",
      },
      {
        source: "csv",
        title: "A PLL for Low-Jitter Clocking",
        year: 2022,
        venue: "CICC",
      },
    ];

    const merged = mergePapers(imported);
    expect(merged).toHaveLength(3);

    const first = upsertPapers(sqlite, merged);
    expect(first).toMatchObject({ inserted: 3, updated: 0, skipped: 0 });

    const second = upsertPapers(sqlite, merged);
    expect(second.inserted).toBe(0);
    expect(second.errors).toEqual([]);

    const count = sqlite.prepare("SELECT COUNT(*) AS n FROM papers").get() as { n: number };
    const ftsCount = sqlite.prepare("SELECT COUNT(*) AS n FROM papers_fts").get() as { n: number };
    expect(count.n).toBe(3);
    expect(ftsCount.n).toBe(3);
    expect(searchSeededPapers(sqlite, { q: "buck pmic", semantic: true })[0].title).toContain("DC-DC");
  });

  it("maps mocked Crossref responses into importable papers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        message: {
          items: [{
            DOI: "10.1109/jssc.2025.123456",
            title: ["A Verified JSSC Paper"],
            author: [{ given: "Ada", family: "Lovelace" }],
            published: { "date-parts": [[2025, 1, 1]] },
            "container-title": ["IEEE Journal of Solid-State Circuits"],
            URL: "https://doi.org/10.1109/jssc.2025.123456",
            "is-referenced-by-count": 12,
          }],
        },
      }),
    })));

    const result = await fetchCrossref({ query: "10.1109/jssc.2025.123456", yearFrom: 2025, yearTo: 2025, limit: 5 });
    expect(result.warnings).toEqual([]);
    expect(result.papers[0]).toMatchObject({
      source: "crossref",
      doi: "10.1109/jssc.2025.123456",
      title: "A Verified JSSC Paper",
      year: 2025,
      publicationTitle: "IEEE Journal of Solid-State Circuits",
      citationCount: 12,
    });
  });
});

describe("core paper citation and auth integration", () => {
  it("exports IEEE, APA, and BibTeX citations", () => {
    expect(paperCitation(paper, "ieee")).toMatchInlineSnapshot(
      `"Ada Lovelace, Grace Hopper, "A 95% Efficient Hybrid DC-DC Converter," IEEE Journal of Solid-State Circuits, 2025. doi: 10.1109/jssc.2025.123456."`,
    );
    expect(paperCitation(paper, "apa")).toMatchInlineSnapshot(
      `"Ada Lovelace, Grace Hopper (2025). A 95% Efficient Hybrid DC-DC Converter. IEEE Journal of Solid-State Circuits. https://doi.org/10.1109/jssc.2025.123456"`,
    );
    expect(paperCitation(paper, "bibtex")).toMatchInlineSnapshot(`
      "@article{Lovelace2025A95EfficientHybridDCDCConver,
        title={A 95% Efficient Hybrid DC-DC Converter},
        author={Ada Lovelace and Grace Hopper},
        year={2025},
        journal={IEEE Journal of Solid-State Circuits},
        doi={10.1109/jssc.2025.123456}
      }"
    `);
  });

  it("rejects tokenless users when auth is enabled and blocks non-admin admin access", () => {
    withAuthConfig({ authEnabled: true, jwtSecret: "x".repeat(40) }, () => {
      const noTokenReq = { cookies: {}, headers: {} } as AuthenticatedRequest;
      const noTokenRes = mockResponse();
      const next = vi.fn();
      requireAuth(noTokenReq, noTokenRes as any, next);
      expect(noTokenRes.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();

      const email = `non-admin-${Date.now()}@example.com`;
      const user = appSqlite.prepare(`
        INSERT INTO users (email, password_hash, verification_status, verification_level, subscription_plan, token_version)
        VALUES (?, 'test', 'verified', 'none', 'free', 0)
        RETURNING id, email
      `).get(email) as { id: number; email: string };
      try {
        const userToken = jwt.sign({ userId: user.id, email: user.email, role: "user", tokenVersion: 0 }, appConfig.jwtSecret);
        const userReq = { cookies: {}, headers: { authorization: `Bearer ${userToken}` } } as AuthenticatedRequest;
        const userRes = mockResponse();
        requireAdmin(userReq, userRes as any, next);
        expect(userRes.statusCode).toBe(403);
        expect(userRes.body).toEqual({ error: "Admin access required" });
      } finally {
        appSqlite.prepare("DELETE FROM users WHERE id = ?").run(user.id);
      }
    });
  });
});
