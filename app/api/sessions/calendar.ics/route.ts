import { NextRequest, NextResponse } from "next/server";
import { buildThinkSessionsCalendarIcs, DEFAULT_SITE_ORIGIN } from "../../../../lib/calendarFeed";
import { fetchPublishedSessions } from "../../../../lib/firebaseContent";

export const dynamic = "force-dynamic";

function resolvePublicOrigin(req: NextRequest): string {
  const envOrigin = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (envOrigin && envOrigin.startsWith("https://")) {
    return envOrigin;
  }
  const fwdHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const fwdProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (fwdHost && !fwdHost.startsWith("localhost") && !fwdHost.startsWith("127.0.0.1")) {
    return `${fwdProto}://${fwdHost}`;
  }
  if (
    req.nextUrl.origin &&
    !req.nextUrl.hostname.includes("localhost") &&
    req.nextUrl.hostname !== "0.0.0.0"
  ) {
    return req.nextUrl.origin;
  }
  return DEFAULT_SITE_ORIGIN;
}

export async function GET(req: NextRequest) {
  try {
    const sessions = await fetchPublishedSessions();
    const origin = resolvePublicOrigin(req);
    const icsBody = buildThinkSessionsCalendarIcs(sessions, origin);

    return new NextResponse(icsBody, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="tta-think-sessions.ics"',
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch {
    return new NextResponse("Unable to generate Think Sessions calendar feed.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
