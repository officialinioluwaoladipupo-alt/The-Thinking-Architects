"use client";

export type QuoteCardPayload = {
  quote: string;
  label: string;
  sourceTitle: string;
  speaker: string;
  speakerRole?: string;
  metaLabel?: string;
  fileSlug?: string;
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function measureAndWrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (let i = 0; i < words.length; i += 1) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = words[i];
      if (lines.length === maxLines - 1) {
        // Put remaining words on last line with ellipsis if needed
        const rest = [line, ...words.slice(i + 1)].join(" ");
        let trimmed = rest;
        while (ctx.measureText(`${trimmed}...`).width > maxWidth && trimmed.length > 4) {
          trimmed = trimmed.slice(0, -1).trimEnd();
        }
        lines.push(ctx.measureText(rest).width > maxWidth ? `${trimmed}...` : rest);
        return lines;
      }
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function downloadQuoteCard({
  quote,
  label,
  sourceTitle,
  speaker,
  speakerRole,
  metaLabel,
  fileSlug,
}: QuoteCardPayload): void {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Architectural dark charcoal paper (matches TTA Wrapped card engine)
  ctx.fillStyle = "#1C1C1C";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle architectural grid
  ctx.strokeStyle = "rgba(242, 237, 232, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 72; x < canvas.width; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 72; y < canvas.height; y += 72) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Top accent bar & brand lockup
  ctx.fillStyle = "#D94F2B";
  ctx.fillRect(84, 84, 120, 6);

  ctx.fillStyle = "#D94F2B";
  ctx.font = "700 42px system-ui, -apple-system, sans-serif";
  ctx.fillText("TTA", 84, 156);

  ctx.fillStyle = "rgba(242, 237, 232, 0.72)";
  ctx.font = "600 22px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText("THE THINKING ARCHITECTS", 184, 152);

  // Takeaway eyebrow tag
  ctx.fillStyle = "#D94F2B";
  ctx.font = "700 22px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(label.toUpperCase(), 84, 248);

  // Framed architectural quote block
  const cardX = 84;
  const cardY = 286;
  const cardW = 912;
  const cardH = 660;
  ctx.fillStyle = "rgba(242, 237, 232, 0.035)";
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(242, 237, 232, 0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Editorial opening quotation mark
  ctx.fillStyle = "#D94F2B";
  ctx.font = "700 110px Georgia, serif";
  ctx.fillText("“", cardX + 48, cardY + 124);

  // Dynamic font sizing based on takeaway length
  const cleanQuote = quote.trim();
  let fontSize = 54;
  let lineHeight = 72;
  let maxLines = 7;
  if (cleanQuote.length > 130) {
    fontSize = 42;
    lineHeight = 58;
    maxLines = 8;
  } else if (cleanQuote.length > 85) {
    fontSize = 48;
    lineHeight = 64;
    maxLines = 7;
  }

  ctx.fillStyle = "#F2EDE8";
  ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`;
  const quoteLines = measureAndWrapLines(ctx, cleanQuote, cardW - 112, maxLines);
  let textY = cardY + 206;
  for (const line of quoteLines) {
    ctx.fillText(line, cardX + 56, textY);
    textY += lineHeight;
  }

  // Speaker attribution inside bottom of quote card
  ctx.strokeStyle = "rgba(242, 237, 232, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 56, cardY + cardH - 128);
  ctx.lineTo(cardX + cardW - 56, cardY + cardH - 128);
  ctx.stroke();

  ctx.fillStyle = "#F2EDE8";
  ctx.font = "600 28px system-ui, -apple-system, sans-serif";
  ctx.fillText(speaker || "The Thinking Architects", cardX + 56, cardY + cardH - 76);

  if (speakerRole) {
    ctx.fillStyle = "rgba(242, 237, 232, 0.64)";
    ctx.font = "500 21px ui-monospace, SFMono-Regular, monospace";
    const roleLines = measureAndWrapLines(ctx, speakerRole, cardW - 112, 1);
    ctx.fillText(roleLines[0] ?? "", cardX + 56, cardY + cardH - 38);
  }

  // Source Session / Media context below frame
  ctx.fillStyle = "rgba(242, 237, 232, 0.56)";
  ctx.font = "700 20px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText((metaLabel || "THINK SESSION").toUpperCase(), 84, 1024);

  ctx.fillStyle = "rgba(242, 237, 232, 0.9)";
  ctx.font = "500 34px system-ui, -apple-system, sans-serif";
  const titleLines = measureAndWrapLines(ctx, sourceTitle, 912, 2);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, 84, 1076 + i * 44);
  });

  // Footer hairline & URL
  ctx.strokeStyle = "rgba(242, 237, 232, 0.14)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(84, 1200);
  ctx.lineTo(996, 1200);
  ctx.stroke();

  ctx.fillStyle = "rgba(242, 237, 232, 0.58)";
  ctx.font = "600 22px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText("THINKSESSIONS · ARCHIVE", 84, 1258);
  ctx.fillText("THETHINKINGARCHITECTS.COM.NG", 570, 1258);

  const safeSlug = (fileSlug || sourceTitle)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const link = document.createElement("a");
  link.download = `tta-quote-${safeSlug || "takeaway"}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
