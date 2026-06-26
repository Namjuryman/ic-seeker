import { appConfig } from "../config.js";
import { appDbRuntime } from "./app-db.js";
import { cacheDbRuntime } from "./cache-db.js";

export type DataLayerTopology = {
  mode: "private-sqlite" | "hybrid-planned";
  metadataStore: {
    provider: "sqlite";
    path: string;
    role: "paper-metadata-and-current-app-data";
  };
  appStore: {
    provider: "sqlite" | "postgres";
    configured: boolean;
    role: "current-app-data" | "future-user-and-business-data";
  };
  cache: {
    provider: "sqlite" | "redis";
    configured: boolean;
    role: "computed-snapshot-cache";
  };
  search: {
    provider: "sqlite" | "meilisearch" | "opensearch" | "elasticsearch";
    configured: boolean;
  };
  objectStorage: {
    provider: "local" | "s3";
    configured: boolean;
    bucket?: string;
  };
  queue: {
    provider: "disabled" | "redis";
    configured: boolean;
  };
};

function hasValue(value: string): boolean {
  return value.trim().length > 0;
}

export function getDataLayerTopology(): DataLayerTopology {
  const postgresConfigured = hasValue(appConfig.postgresUrl);
  const redisConfigured = hasValue(appConfig.redisUrl);
  const meiliConfigured = appConfig.searchEngine === "meilisearch" && hasValue(appConfig.meilisearchHost);
  const objectStorageConfigured = appConfig.objectStorageProvider === "s3"
    && hasValue(appConfig.objectStorageEndpoint)
    && hasValue(appConfig.objectStorageBucket);
  const queueConfigured = appConfig.queueBackend === "redis" && redisConfigured;

  return {
    mode: postgresConfigured || redisConfigured || meiliConfigured || objectStorageConfigured
      ? "hybrid-planned"
      : "private-sqlite",
    metadataStore: {
      provider: "sqlite",
      path: appConfig.dbPath,
      role: "paper-metadata-and-current-app-data",
    },
    appStore: {
      provider: appDbRuntime.provider === "postgres-planned" ? "postgres" : "sqlite",
      configured: postgresConfigured,
      role: postgresConfigured ? "future-user-and-business-data" : "current-app-data",
    },
    cache: {
      provider: cacheDbRuntime.provider === "redis-planned" ? "redis" : "sqlite",
      configured: redisConfigured,
      role: "computed-snapshot-cache",
    },
    search: {
      provider: meiliConfigured ? "meilisearch" : "sqlite",
      configured: meiliConfigured,
    },
    objectStorage: {
      provider: objectStorageConfigured ? "s3" : "local",
      configured: objectStorageConfigured,
      bucket: objectStorageConfigured ? appConfig.objectStorageBucket : undefined,
    },
    queue: {
      provider: queueConfigured ? "redis" : "disabled",
      configured: queueConfigured,
    },
  };
}
