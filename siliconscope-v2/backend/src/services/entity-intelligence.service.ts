import { sqlite } from "../db/connection.js";
import { profileService } from "./profile.service.js";
import { mentorService } from "./mentor.service.js";
import { companyService } from "./company.service.js";
import { institutionIdentityService } from "./institution-identity.service.js";

function confidenceBucket(value: number) {
  if (value >= 80) return "high";
  if (value >= 60) return "medium";
  return "needs_review";
}

function parseJson(value: unknown, fallback: any = {}) {
  try { return JSON.parse(String(value || "")); } catch { return fallback; }
}

function currentYear() { return new Date().getFullYear(); }

function slope(points: Array<{ key?: string; year?: number; count: number }>) {
  const rows = points.map((item) => ({ year: Number(item.year ?? item.key), count: Number(item.count || 0) })).filter((item) => Number.isFinite(item.year));
  if (rows.length < 2) return 0;
  const first = rows.slice(0, Math.ceil(rows.length / 2)).reduce((sum, item) => sum + item.count, 0);
  const last = rows.slice(Math.floor(rows.length / 2)).reduce((sum, item) => sum + item.count, 0);
  return last - first;
}

function geoPoint(name: string) {
  const key = institutionIdentityService.normalizeKey(name);
  const row = sqlite.prepare("SELECT * FROM institution_geo_points WHERE normalized_key = ?").get(key) as any;
  if (row) {
    return {
      canonicalName: row.canonical_name,
      countryCode: row.country_code,
      countryName: row.country_name,
      region: row.region,
      city: row.city,
      latitude: row.latitude,
      longitude: row.longitude,
      source: row.geocode_source,
      confidence: Number(row.confidence || 0),
      evidence: parseJson(row.evidence_json, {}),
    };
  }
  const alias = sqlite.prepare("SELECT * FROM institution_aliases WHERE alias = ? OR canonical_name = ? ORDER BY confidence DESC LIMIT 1").get(key, name) as any;
  return alias ? {
    canonicalName: alias.canonical_name,
    countryCode: alias.country_code,
    countryName: alias.country_name,
      region: alias.country_name || "待确认",
    city: alias.city,
    latitude: null,
    longitude: null,
    source: alias.source || "identity_alias",
    confidence: Number(alias.confidence || 0),
    evidence: { alias: alias.alias },
  } : null;
}

function publicationSignals(profile: any) {
  const recentStart = currentYear() - 9;
  const recent = (profile.byYear || []).filter((item: any) => Number(item.key) >= recentStart).reduce((sum: number, item: any) => sum + Number(item.count || 0), 0);
  const trend = slope(profile.byYear || []);
  return {
    totalPapers: profile.paperCount || profile.papers || 0,
    recentPapers: recent,
    trend: trend > 3 ? "rising" : trend < -3 ? "cooling" : "stable",
    topFields: profile.byDomain || [],
    topVenues: profile.byVenue || [],
    yearlyTrend: profile.byYear || [],
    representativePapers: (profile.papers || []).slice(0, 12),
  };
}

export const entityIntelligenceService = {
  institution(name: string) {
    const profile = profileService.getInstitutionProfile(name) as any;
    const geo = geoPoint(profile?.name || name);
    const confidence = Math.round(Math.max(Number(profile?.identity?.confidence || 0), Number(geo?.confidence || 0), 40));
    const signals = publicationSignals(profile);
    return {
      generatedAt: new Date().toISOString(),
      entityType: "institution",
      name: profile.name || name,
      requestedName: name,
      identity: profile.identity,
      geo,
      publicationSignals: signals,
      strongAreas: (signals.topFields || []).slice(0, 8).map((item: any) => ({ field: item.key, papers: item.count })),
      representativeAuthors: profile.authors || [],
      collaborationHints: {
        coauthorInstitutions: [],
        note: "合作图谱依赖已归一化的机构边；当前仅适合作为元数据线索起点。",
      },
      confidence,
      confidenceBucket: confidenceBucket(confidence),
      caveat: "机构情报基于论文元数据，依赖作者和机构归一化完整度；不等同于录取保证、官方排名或最终学术评价。",
    };
  },

  mentor(name: string, params: Record<string, string> = {}) {
    const profile = mentorService.getMentorProfile(name, params) as any;
    const signals = publicationSignals(profile);
    const recentRatio = signals.totalPapers ? Math.round((signals.recentPapers / signals.totalPapers) * 100) : 0;
    return {
      generatedAt: new Date().toISOString(),
      entityType: "mentor",
      name: profile.name || name,
      requestedName: name,
      roleStage: profile.roleStage,
      likelyMentor: profile.likelyMentor,
      firstYear: profile.firstYear,
      lastYear: profile.lastYear,
      careerSpan: profile.careerSpan,
      publicationSignals: signals,
      collaborationNetwork: {
        coauthors: profile.coauthors || [],
        institutions: profile.institutions || [],
      },
      fitFilters: {
        activeRecently: recentRatio >= 25,
        primaryFields: (signals.topFields || []).slice(0, 5),
        venueMix: (signals.topVenues || []).slice(0, 8),
      },
      reviewPolicy: {
        thresholdProtected: true,
        commentsReturnedOnlyAtApprovedCountAtLeast: 10,
        note: "匿名研究者评价汇总必须通过阈值保护和审核后才会展示。",
      },
      caveat: "研究者画像结合论文元数据和阈值保护后的社区信息；不构成定性裁决、录取建议或就业建议。",
    };
  },

  company(id: string) {
    const company = companyService.getCompany(id) as any;
    if (!company) return null;
    const papers = companyService.getRelatedPapers(id, 12) as any;
    const roadmaps = companyService.getRelatedRoadmaps(id) as any;
    return {
      generatedAt: new Date().toISOString(),
      entityType: "company",
      company,
      productLines: company.productLines || [],
      technologyDirections: company.technologyKeywords || [],
      careerDirections: company.careerRoles || [],
      relatedPapers: papers?.rows || papers?.papers || [],
      relatedRoadmaps: roadmaps?.roadmaps || roadmaps || [],
      marketDataCaveat: "行情数据仅作为背景元数据。SiliconScope 不提供投资建议。",
      companyDataPolicy: "企业情报尽量使用公开元数据、官方/企业来源和字段级溯源；不作为企业定性裁决、员工评价或招聘抓取。",
    };
  },

  cityMap(params: { field?: string; yearFrom?: number; yearTo?: number } = {}) {
    const conditions: string[] = [];
    const args: any[] = [];
    if (params.field) { conditions.push("domain = ?"); args.push(params.field); }
    if (params.yearFrom) { conditions.push("year >= ?"); args.push(Number(params.yearFrom)); }
    if (params.yearTo) { conditions.push("year <= ?"); args.push(Number(params.yearTo)); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const papers = sqlite.prepare(`SELECT id, title, affiliations, domain, year, quality_score FROM papers ${where} LIMIT 50000`).all(...args) as any[];
    const geoRows = sqlite.prepare("SELECT * FROM institution_geo_points").all() as any[];
    const byKey = new Map(geoRows.map((row) => [row.normalized_key, row]));
    const cityMap = new Map<string, any>();
    for (const paper of papers) {
      const insts = String(paper.affiliations || "").split(";").map((item) => item.trim()).filter(Boolean).slice(0, 12);
      for (const inst of insts) {
        const key = institutionIdentityService.normalizeKey(inst);
        const geo = byKey.get(key);
        if (!geo?.city && !geo?.country_name) continue;
        const cityKey = [geo.country_code || geo.country_name || "XX", geo.city || "待确认城市"].join("|");
        const entry = cityMap.get(cityKey) || {
          key: cityKey,
          countryCode: geo.country_code,
          countryName: geo.country_name,
          region: geo.region,
          city: geo.city || "待确认城市",
          latitude: geo.latitude,
          longitude: geo.longitude,
          papers: 0,
          score: 0,
          institutions: new Map<string, number>(),
          fields: new Map<string, number>(),
        };
        entry.papers += 1;
        entry.score += Number(paper.quality_score || 0);
        entry.institutions.set(geo.canonical_name || inst, (entry.institutions.get(geo.canonical_name || inst) || 0) + 1);
        entry.fields.set(paper.domain || "General IC", (entry.fields.get(paper.domain || "General IC") || 0) + 1);
        cityMap.set(cityKey, entry);
      }
    }
    const rows = [...cityMap.values()].map((entry) => ({
      key: entry.key,
      countryCode: entry.countryCode,
      countryName: entry.countryName,
      region: entry.region,
      city: entry.city,
      latitude: entry.latitude,
      longitude: entry.longitude,
      papers: entry.papers,
      score: Math.round(entry.score),
      avgScore: Math.round((entry.score / Math.max(1, entry.papers)) * 10) / 10,
      topInstitutions: [...entry.institutions.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      byField: [...entry.fields.entries()].map(([field, count]) => ({ field, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    })).sort((a, b) => b.score - a.score || b.papers - a.papers);
    return {
      generatedAt: new Date().toISOString(),
      filters: params,
      totalCities: rows.length,
      rows,
      caveat: "城市级地图依赖人工或可信地理编码；缺失或模糊的单位会被排除，而不是强行猜测。",
    };
  },
};
