export type SqlitePragmaConnection = {
  pragma: (source: string) => unknown;
};

export function enableForeignKeys(sqlite: SqlitePragmaConnection) {
  sqlite.pragma("foreign_keys = ON");
}

export function foreignKeysEnabled(sqlite: SqlitePragmaConnection) {
  const value = sqlite.pragma("foreign_keys") as Array<{ foreign_keys?: number }> | number | undefined;
  if (Array.isArray(value)) return Number(value[0]?.foreign_keys || 0) === 1;
  return Number(value || 0) === 1;
}
