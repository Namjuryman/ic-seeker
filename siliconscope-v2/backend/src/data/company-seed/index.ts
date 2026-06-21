import { fablessCompanies } from "./fabless.js";
import { fablessExtraCompanies } from "./fabless-extra.js";
import { foundryCompanies } from "./foundries.js";
import { idmCompanies } from "./idm.js";
import { memoryIdmCompanies } from "./memory-idm.js";
import { supplyChainCompanies } from "./supply-chain.js";
import type { RawCompanySeed } from "./types.js";

export { COMPANY_TYPE_MAP, REGION_COUNTRY_MAP, type RawCompanySeed } from "./types.js";

export const companySeedData: RawCompanySeed[] = [
  ...foundryCompanies,
  ...fablessCompanies,
  ...fablessExtraCompanies,
  ...idmCompanies,
  ...memoryIdmCompanies,
  ...supplyChainCompanies,
];
