import { ImageResponse } from "next/og";

export const alt =
  "TTA · The Thinking Architects – Figure out the profession with people who've done it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f7f6f4",
          color: "#111111",
          padding: "72px 84px",
          border: "1px solid rgba(17, 17, 17, 0.1)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#fe3619",
            }}
          >
            TTA
          </span>
          <span
            style={{
              width: "1px",
              height: "20px",
              backgroundColor: "rgba(17, 17, 17, 0.2)",
            }}
          />
          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#111111",
              textTransform: "uppercase",
            }}
          >
            The Thinking Architects
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "980px" }}>
          <div
            style={{
              fontSize: "68px",
              fontWeight: 500,
              lineHeight: 1.06,
              letterSpacing: "-0.03em",
            }}
          >
            Figure out the profession with people who&apos;ve done it.
          </div>
          <div
            style={{
              fontSize: "28px",
              lineHeight: 1.4,
              color: "rgba(17, 17, 17, 0.7)",
            }}
          >
            A media and events community for architecture students, graduates, and practitioners.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(17, 17, 17, 0.12)",
            paddingTop: "24px",
            fontSize: "18px",
            letterSpacing: "0.08em",
            color: "rgba(17, 17, 17, 0.6)",
            textTransform: "uppercase",
          }}
        >
          <span>Think Sessions · Media · Community</span>
          <span>hello@thethinkingarchitects.com.ng</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
