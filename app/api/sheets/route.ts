import { NextRequest, NextResponse } from "next/server";

const SPREADSHEET_ID_REGEX = /^[a-zA-Z0-9_-]{10,128}$/;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Google Sheets access token. Please connect Google Sheets first." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const spreadsheetId = (searchParams.get("spreadsheetId") ?? "").trim();
  const mode = searchParams.get("mode") ?? "metadata";
  const sheetName = (searchParams.get("sheetName") ?? "").trim();

  if (!SPREADSHEET_ID_REGEX.test(spreadsheetId)) {
    return NextResponse.json(
      { error: "Invalid Google Spreadsheet ID." },
      { status: 400 },
    );
  }

  if (mode === "metadata") {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}?fields=properties.title,sheets(properties(sheetId,title,index))`;

    const res = await fetch(url, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as {
      properties?: { title?: string };
      sheets?: Array<{
        properties?: { sheetId?: number; title?: string; index?: number };
      }>;
      error?: { message?: string; status?: string };
    };

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message ||
            "Unable to read spreadsheet metadata. Check access permissions or reconnect Google Sheets.",
        },
        { status: res.status },
      );
    }

    const tabs = (data.sheets ?? [])
      .map((s) => ({
        sheetId: s.properties?.sheetId ?? 0,
        title: s.properties?.title ?? "",
        index: s.properties?.index ?? 0,
      }))
      .filter((t) => Boolean(t.title))
      .sort((a, b) => a.index - b.index);

    return NextResponse.json({
      spreadsheetTitle: data.properties?.title ?? "Untitled Spreadsheet",
      tabs,
    });
  }

  if (mode === "values") {
    if (!sheetName) {
      return NextResponse.json(
        { error: "A sheet tab name is required to read member rows." },
        { status: 400 },
      );
    }

    const escapedTab = `'${sheetName.replace(/'/g, "''")}'!A1:ZZ5000`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}/values/${encodeURIComponent(escapedTab)}?majorDimension=ROWS`;

    const res = await fetch(url, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as {
      values?: string[][];
      error?: { message?: string };
    };

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message ||
            "Unable to read rows from the selected sheet tab.",
        },
        { status: res.status },
      );
    }

    return NextResponse.json({
      values: Array.isArray(data.values) ? data.values : [],
    });
  }

  return NextResponse.json({ error: "Unsupported mode." }, { status: 400 });
}
