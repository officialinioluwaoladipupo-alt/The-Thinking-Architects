export type SpreadsheetTabInfo = {
  sheetId: number;
  title: string;
  index: number;
};

export type SpreadsheetMetadataResponse = {
  spreadsheetTitle: string;
  tabs: SpreadsheetTabInfo[];
};

export type SheetColumnMapping = {
  emailColumn: string;
  stageColumn: string;
  locationColumn: string;
};

export type SheetCommunityMetrics = {
  totalRows: number;
  communityTotal: number;
  studentsCount: number;
  graduatesCount: number;
  professionalsCount: number;
  otherStageCount: number;
  countriesCount: number;
  topLocations: string[];
  headers: string[];
};

export function extractSpreadsheetId(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{10,128})/);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  if (/^[a-zA-Z0-9_-]{10,128}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function detectSheetColumns(headers: string[]): SheetColumnMapping {
  const findMatch = (keywords: string[]): string => {
    for (const h of headers) {
      const lower = h.toLowerCase();
      if (keywords.some((kw) => lower.includes(kw))) {
        return h;
      }
    }
    return "";
  };

  return {
    emailColumn: findMatch(["email", "e-mail", "mail"]),
    stageColumn: findMatch([
      "journey",
      "stage",
      "level",
      "status",
      "role",
      "career",
      "profession",
      "where are you",
    ]),
    locationColumn: findMatch([
      "country",
      "location",
      "city",
      "state",
      "region",
      "where do you live",
      "based",
    ]),
  };
}

function classifyStage(rawValue: string): "student" | "graduate" | "professional" | "other" {
  const val = rawValue.trim().toLowerCase();
  if (!val) return "other";

  if (
    val.includes("student") ||
    val.includes("undergrad") ||
    val.includes("b.arch") ||
    val.includes("barch") ||
    val.includes("b.sc") ||
    val.includes("bsc") ||
    val.includes("m.arch") ||
    val.includes("march") ||
    val.includes("intern") ||
    val.includes("siwes") ||
    val.includes("school") ||
    /\b[1-6]00\s*l(evel)?\b/.test(val)
  ) {
    return "student";
  }

  if (
    val.includes("registered") ||
    val.includes("practi") ||
    val.includes("arcon") ||
    val.includes("nia") ||
    val.includes("principal") ||
    val.includes("partner") ||
    val.includes("associate") ||
    val.includes("senior") ||
    val.includes("director") ||
    val.includes("architect")
  ) {
    // Disambiguate "early-career architect" / "graduate architect" before falling into senior practitioners
    if (
      val.includes("graduate") ||
      val.includes("early") ||
      val.includes("nysc") ||
      val.includes("corps") ||
      val.includes("junior") ||
      val.includes("entry")
    ) {
      return "graduate";
    }
    return "professional";
  }

  if (
    val.includes("graduate") ||
    val.includes("early") ||
    val.includes("nysc") ||
    val.includes("corps") ||
    val.includes("junior") ||
    val.includes("entry") ||
    val.includes("post")
  ) {
    return "graduate";
  }

  return "other";
}

function normalizeLocationLabel(raw: string): string {
  const cleaned = raw
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (!cleaned) return "";

  const lower = cleaned.toLowerCase();
  if (lower === "uk" || lower === "u.k." || lower === "united kingdom") return "United Kingdom";
  if (lower === "usa" || lower === "u.s.a" || lower === "us" || lower === "united states" || lower === "united states of america") {
    return "United States";
  }
  if (lower === "uae" || lower === "united arab emirates") return "UAE";
  if (lower === "ng" || lower === "nigeria") return "Nigeria";

  // Preserve readable capitalization if user entered lowercase
  if (cleaned === lower) {
    return cleaned.replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return cleaned;
}

export function analyzeMemberSheetRows(
  rows: string[][],
  mapping: SheetColumnMapping,
): SheetCommunityMetrics {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      totalRows: 0,
      communityTotal: 0,
      studentsCount: 0,
      graduatesCount: 0,
      professionalsCount: 0,
      otherStageCount: 0,
      countriesCount: 0,
      topLocations: [],
      headers: [],
    };
  }

  const headers = (rows[0] ?? []).map((cell) => String(cell ?? "").trim());
  const dataRows = rows
    .slice(1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? "").trim() !== ""));

  const emailIdx = mapping.emailColumn ? headers.indexOf(mapping.emailColumn) : -1;
  const stageIdx = mapping.stageColumn ? headers.indexOf(mapping.stageColumn) : -1;
  const locationIdx = mapping.locationColumn ? headers.indexOf(mapping.locationColumn) : -1;

  const seenEmails = new Set<string>();
  const locationCounts = new Map<string, { label: string; count: number }>();

  let communityTotal = 0;
  let studentsCount = 0;
  let graduatesCount = 0;
  let professionalsCount = 0;
  let otherStageCount = 0;

  for (const row of dataRows) {
    if (emailIdx >= 0) {
      const email = String(row[emailIdx] ?? "").trim().toLowerCase();
      if (email && email.includes("@")) {
        if (seenEmails.has(email)) continue;
        seenEmails.add(email);
      }
    }

    communityTotal += 1;

    if (stageIdx >= 0) {
      const stageRaw = String(row[stageIdx] ?? "");
      const bucket = classifyStage(stageRaw);
      if (bucket === "student") studentsCount += 1;
      else if (bucket === "graduate") graduatesCount += 1;
      else if (bucket === "professional") professionalsCount += 1;
      else otherStageCount += 1;
    }

    if (locationIdx >= 0) {
      const locRaw = String(row[locationIdx] ?? "").trim();
      if (locRaw) {
        // Support multi-part like "Lagos, Nigeria" by taking the last part as country when comma-separated if sensible,
        // or keeping the whole concise value
        const normalized = normalizeLocationLabel(locRaw);
        if (normalized) {
          const key = normalized.toLowerCase();
          const prev = locationCounts.get(key);
          if (prev) {
            prev.count += 1;
          } else {
            locationCounts.set(key, { label: normalized, count: 1 });
          }
        }
      }
    }
  }

  const sortedLocations = Array.from(locationCounts.values()).sort((a, b) => b.count - a.count);

  return {
    totalRows: dataRows.length,
    communityTotal,
    studentsCount,
    graduatesCount,
    professionalsCount,
    otherStageCount,
    countriesCount: sortedLocations.length,
    topLocations: sortedLocations.slice(0, 10).map((item) => item.label),
    headers,
  };
}

export async function fetchSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string,
): Promise<SpreadsheetMetadataResponse> {
  const res = await fetch(
    `/api/sheets?mode=metadata&spreadsheetId=${encodeURIComponent(spreadsheetId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  const data = (await res.json().catch(() => ({}))) as SpreadsheetMetadataResponse & {
    error?: string;
  };
  if (!res.ok) {
    const err = new Error(data.error || "Could not load spreadsheet details.") as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function fetchSpreadsheetRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
): Promise<string[][]> {
  const res = await fetch(
    `/api/sheets?mode=values&spreadsheetId=${encodeURIComponent(spreadsheetId)}&sheetName=${encodeURIComponent(sheetName)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    values?: string[][];
    error?: string;
  };
  if (!res.ok) {
    const err = new Error(data.error || "Could not read rows from sheet.") as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return Array.isArray(data.values) ? data.values : [];
}
