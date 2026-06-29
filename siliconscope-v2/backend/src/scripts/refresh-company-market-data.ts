import { appSqlite } from "../db/app-db.js";
import { ensureCompanyTables } from "./company-schema.js";

type QuoteRow = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  marketCap?: number;
  currency?: string;
  regularMarketTime?: number;
};

const BATCH_SIZE = 24;

function primaryYahooSymbol(ticker: string | null | undefined) {
  if (!ticker) return "";
  return String(ticker)
    .split("/")
    .map((part) => part.trim())
    .find(Boolean) || "";
}

function marketCapLabel(value: number | undefined) {
  if (!Number.isFinite(value) || !value) return "";
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(value).toLocaleString()}`;
}

async function fetchQuotes(symbols: string[]) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "SiliconScope company metadata refresh/0.1",
        accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`Yahoo Finance returned HTTP ${res.status} for ${symbols.join(", ")}; skipping this batch.`);
      return [];
    }
    const json = await res.json() as { quoteResponse?: { result?: QuoteRow[] } };
    return json.quoteResponse?.result || [];
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  ensureCompanyTables(appSqlite);
  const limit = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || 500);
  const dryRun = process.argv.includes("--dry-run");

  const companies = appSqlite.prepare(`
    SELECT id, name, stock_ticker
    FROM companies
    WHERE COALESCE(stock_ticker, '') != ''
    ORDER BY name COLLATE NOCASE
    LIMIT ?
  `).all(limit) as Array<{ id: string; name: string; stock_ticker: string }>;

  const symbolToCompany = new Map<string, { id: string; name: string }>();
  for (const company of companies) {
    const symbol = primaryYahooSymbol(company.stock_ticker);
    if (symbol) symbolToCompany.set(symbol, { id: company.id, name: company.name });
  }

  const symbols = [...symbolToCompany.keys()];
  let updated = 0;
  let missing = 0;

  const update = appSqlite.prepare(`
    UPDATE companies
    SET stock_price = @stockPrice,
        stock_currency = @currency,
        stock_change_percent = @changePercent,
        market_cap_usd = @marketCapUsd,
        market_cap_label = @marketCapLabel,
        market_data_source = 'Yahoo Finance quote endpoint',
        market_data_as_of = @asOf,
        last_enriched_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);

  for (let index = 0; index < symbols.length; index += BATCH_SIZE) {
    const batch = symbols.slice(index, index + BATCH_SIZE);
    const quotes = await fetchQuotes(batch);
    const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));

    for (const symbol of batch) {
      const company = symbolToCompany.get(symbol);
      const quote = quoteMap.get(symbol);
      if (!company || !quote || !Number.isFinite(quote.regularMarketPrice)) {
        missing += 1;
        continue;
      }
      const marketCap = Number(quote.marketCap || 0);
      const asOf = quote.regularMarketTime
        ? new Date(quote.regularMarketTime * 1000).toISOString()
        : new Date().toISOString();
      const row = {
        id: company.id,
        stockPrice: String(quote.regularMarketPrice),
        currency: quote.currency || "",
        changePercent: Number.isFinite(quote.regularMarketChangePercent) ? quote.regularMarketChangePercent : null,
        marketCapUsd: marketCap ? String(marketCap) : null,
        marketCapLabel: marketCapLabel(marketCap),
        asOf,
      };
      if (!dryRun) update.run(row);
      updated += 1;
      console.log(`${dryRun ? "[dry-run] " : ""}${company.name}: ${symbol} ${row.currency} ${row.stockPrice} ${row.changePercent ?? "-"}% ${row.marketCapLabel}`);
    }
  }

  console.log(JSON.stringify({ scannedCompanies: companies.length, symbols: symbols.length, updated, missing, dryRun }, null, 2));
}

main().catch((err) => {
  console.warn(`Market refresh finished with source error: ${(err as Error).message}`);
  process.exit(0);
});
