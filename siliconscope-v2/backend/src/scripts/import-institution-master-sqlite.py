#!/usr/bin/env python3
"""Import the strict institution master JSON into the application SQLite database."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import sqlite3
import unicodedata
from pathlib import Path


def normalize(value: str) -> str:
    value = html.unescape(str(value or ""))
    value = unicodedata.normalize("NFKD", value)
    value = "".join(char for char in value if not unicodedata.combining(char)).lower()
    value = value.replace("&", " and ")
    value = re.sub(r"\buniv\b", "university", value)
    value = re.sub(r"\binst\b", "institute", value)
    value = re.sub(r"\btech\b", "technology", value)
    value = re.sub(r"[^\w]+", " ", value, flags=re.UNICODE)
    return re.sub(r"\s+", " ", value).strip()


def split_subunits(value: str) -> list[str]:
    return [item.strip() for item in str(value or "").split("|") if item.strip()]


def region_for(code: str) -> str:
    if code in {"US", "CA", "MX"}: return "North America"
    if code in {"BR", "AR", "CL", "CO", "UY"}: return "Latin America"
    if code in {"CN", "HK", "MO", "TW", "KR", "JP"}: return "East Asia"
    if code in {"SG", "MY", "TH", "VN", "ID", "PH"}: return "Southeast Asia"
    if code in {"IN", "PK", "BD", "NP", "LK"}: return "South Asia"
    if code in {"AU", "NZ"}: return "Oceania"
    if code in {"IL", "TR", "SA", "AE", "QA", "LB"}: return "Middle East"
    if code in {"GB", "UK", "IE", "NL", "BE", "CH", "DE", "FR", "IT", "ES", "PT", "DK", "SE", "NO", "FI", "AT", "PL", "CZ", "HU", "RO", "BG", "GR", "UA", "RU"}: return "Europe"
    return "Other"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", required=True, type=Path)
    parser.add_argument("--master", required=True, type=Path)
    parser.add_argument("--backup", type=Path)
    args = parser.parse_args()

    rows = json.loads(args.master.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or len(rows) < 1000:
        raise RuntimeError("Institution master is unexpectedly small or invalid")

    backup = args.backup or args.database.with_suffix(args.database.suffix + ".pre-institution-import.bak")
    shutil.copy2(args.database, backup)

    connection = sqlite3.connect(args.database)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 30000")
    now_source = "strict-master-v2.9-2026-06-23"

    geo_sql = """
      INSERT INTO institution_geo_points (
        normalized_key, canonical_name, country_code, country_name, region, city,
        latitude, longitude, geocode_source, confidence, evidence_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(normalized_key) DO UPDATE SET
        canonical_name=excluded.canonical_name, country_code=excluded.country_code,
        country_name=excluded.country_name, region=excluded.region, city=excluded.city,
        latitude=excluded.latitude, longitude=excluded.longitude,
        geocode_source=excluded.geocode_source, confidence=excluded.confidence,
        evidence_json=excluded.evidence_json, updated_at=CURRENT_TIMESTAMP
    """
    alias_sql = """
      INSERT INTO institution_aliases (
        alias, canonical_name, country_code, country_name, city, source, confidence, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(alias) DO UPDATE SET
        canonical_name=excluded.canonical_name, country_code=excluded.country_code,
        country_name=excluded.country_name, city=excluded.city, source=excluded.source,
        confidence=excluded.confidence, updated_at=CURRENT_TIMESTAMP
    """
    candidate_sql = """
      INSERT INTO institution_identity_candidates (
        id, normalized_key, canonical_name, aliases_json, country_code, country_name,
        city, paper_count, confidence, review_status, evidence_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        normalized_key=excluded.normalized_key, canonical_name=excluded.canonical_name,
        aliases_json=excluded.aliases_json, country_code=excluded.country_code,
        country_name=excluded.country_name, city=excluded.city,
        paper_count=excluded.paper_count, confidence=excluded.confidence,
        review_status='approved', evidence_json=excluded.evidence_json,
        updated_at=CURRENT_TIMESTAMP
    """

    with connection:
        connection.execute("DELETE FROM institution_geo_points")
        connection.execute("DELETE FROM institution_aliases")
        connection.execute("DELETE FROM institution_identity_candidates")
        alias_count = 0
        # Lower-volume records are inserted first so ambiguous aliases retain the
        # institution with stronger evidence when a later row conflicts.
        for row in sorted(rows, key=lambda item: int(item.get("paper_count") or 0)):
            canonical = str(row.get("canonical_name") or "").strip()
            key = normalize(canonical)
            if not key:
                continue
            code = str(row.get("country_code") or "").upper()
            confidence = max(0, min(100, int(row.get("geo_confidence") or 0)))
            aliases = list(dict.fromkeys([
                canonical,
                str(row.get("acronym") or "").strip(),
                *split_subunits(row.get("merged_subunits") or ""),
            ]))
            aliases = [alias for alias in aliases if alias]
            evidence = json.dumps({
                "ror_id": row.get("ror_id"),
                "institution_id": row.get("institution_id"),
                "paper_count": int(row.get("paper_count") or 0),
                "raw_mention_count": int(row.get("raw_mention_count") or 0),
                "match_status": row.get("match_status"),
                "source": now_source,
            }, ensure_ascii=False)
            connection.execute(geo_sql, (
                key, canonical, code, row.get("country_name"), region_for(code), row.get("city"),
                row.get("latitude"), row.get("longitude"), now_source, confidence, evidence,
            ))
            for alias in aliases:
                alias_key = normalize(alias)
                if not alias_key:
                    continue
                connection.execute(alias_sql, (
                    alias_key, canonical, code, row.get("country_name"), row.get("city"), now_source, confidence,
                ))
                alias_count += 1
            candidate_id = str(row.get("ror_id") or row.get("institution_id") or f"master:{hashlib.sha1(key.encode()).hexdigest()}")
            connection.execute(candidate_sql, (
                candidate_id, key, canonical, json.dumps(aliases, ensure_ascii=False), code,
                row.get("country_name"), row.get("city"), int(row.get("paper_count") or 0),
                confidence, evidence,
            ))

    counts = {
        table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        for table in ("institution_geo_points", "institution_aliases", "institution_identity_candidates")
    }
    connection.close()
    print(json.dumps({"database": str(args.database), "backup": str(backup), "master_rows": len(rows), "alias_attempts": alias_count, "counts": counts}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
