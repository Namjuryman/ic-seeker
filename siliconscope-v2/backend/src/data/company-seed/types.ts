export type RawCompanyType =
  | "fab"
  | "fabless"
  | "idm"
  | "osat"
  | "equipment"
  | "materials"
  | "ip"
  | "eda";

export type RawRegion =
  | "中国大陆"
  | "中国台湾"
  | "美国"
  | "韩国"
  | "日本"
  | "以色列"
  | "荷兰"
  | "德国"
  | "英国"
  | "挪威"
  | "欧洲"
  | "新加坡"
  | "瑞士"
  | "奥地利"
  | "加拿大";

export interface RawCompanySeed {
  name: string;
  nameEn: string;
  type: RawCompanyType;
  region: RawRegion;
  city?: string;
  headquarters?: string;
  employees?: string;
  website?: string;
  foundedYear?: number;
  ticker?: string;
  exchange?: string;
  description: string;
  specialties: string[];
  domains?: string[];
  aliases?: string[];
  sourceUrls?: string[];
}

export const COMPANY_TYPE_MAP: Record<RawCompanyType, string> = {
  fab: "Foundry",
  fabless: "Fabless IC Design",
  idm: "IDM",
  osat: "OSAT / Packaging",
  equipment: "Equipment",
  materials: "Materials",
  ip: "Semiconductor IP",
  eda: "EDA",
};

export const REGION_COUNTRY_MAP: Record<RawRegion, string> = {
  中国大陆: "China",
  中国台湾: "Taiwan",
  美国: "United States",
  韩国: "South Korea",
  日本: "Japan",
  以色列: "Israel",
  荷兰: "Netherlands",
  德国: "Germany",
  英国: "United Kingdom",
  挪威: "Norway",
  欧洲: "Europe",
  新加坡: "Singapore",
  瑞士: "Switzerland",
  奥地利: "Austria",
  加拿大: "Canada",
};

export function c(seed: RawCompanySeed): RawCompanySeed {
  return seed;
}
