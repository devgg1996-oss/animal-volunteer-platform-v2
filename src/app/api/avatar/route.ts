import { NextResponse } from "next/server";

const ANIMALS = new Set(["dog", "cat", "rabbit", "bear"] as const);
const COLORS: Record<string, { bg: string; fg: string }> = {
  orange: { bg: "#FFEDD5", fg: "#F97316" },
  blue: { bg: "#DBEAFE", fg: "#2563EB" },
  green: { bg: "#DCFCE7", fg: "#16A34A" },
  purple: { bg: "#EDE9FE", fg: "#7C3AED" },
  pink: { bg: "#FCE7F3", fg: "#DB2777" },
  gray: { bg: "#F3F4F6", fg: "#374151" },
};

function animalMarkup(animal: string, fg: string) {
  // Cute, font-independent vector icons (rounded, consistent style).
  const stroke = fg;
  const headFill = "rgba(255,255,255,0.78)";
  const blush = `rgba(0,0,0,0.06)`;

  const face = `
    <circle cx="128" cy="142" r="58" fill="${headFill}"/>
    <circle cx="107" cy="142" r="6.5" fill="${stroke}"/>
    <circle cx="149" cy="142" r="6.5" fill="${stroke}"/>
    <ellipse cx="96" cy="160" rx="15" ry="9" fill="${blush}"/>
    <ellipse cx="160" cy="160" rx="15" ry="9" fill="${blush}"/>
    <circle cx="128" cy="158" r="8" fill="${stroke}" opacity="0.9"/>
    <path d="M120 170c5 6 11 6 16 0" fill="none" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/>
  `;

  if (animal === "dog") {
    // floppy ears
    return `
      <path d="M70 118c-14 12-18 30-12 50 6 18 24 26 40 20" fill="none" stroke="${stroke}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M186 118c14 12 18 30 12 50-6 18-24 26-40 20" fill="none" stroke="${stroke}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
      ${face}
      <path d="M112 132c4-6 10-10 16-10s12 4 16 10" fill="none" stroke="${stroke}" stroke-width="6" stroke-linecap="round" opacity="0.35"/>
    `;
  }

  if (animal === "cat") {
    // pointy ears + whiskers
    return `
      <path d="M96 122L110 88l12 34" fill="none" stroke="${stroke}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M160 122L146 88l-12 34" fill="none" stroke="${stroke}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      ${face}
      <path d="M74 152h32" stroke="${stroke}" stroke-width="6" stroke-linecap="round" opacity="0.45"/>
      <path d="M74 168h32" stroke="${stroke}" stroke-width="6" stroke-linecap="round" opacity="0.45"/>
      <path d="M150 152h32" stroke="${stroke}" stroke-width="6" stroke-linecap="round" opacity="0.45"/>
      <path d="M150 168h32" stroke="${stroke}" stroke-width="6" stroke-linecap="round" opacity="0.45"/>
    `;
  }

  if (animal === "rabbit") {
    // long ears (filled, rounded) - more natural look
    return `
      <path d="M106 64c-20 24-18 70 10 98" fill="${headFill}" stroke="${stroke}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M150 64c20 24 18 70-10 98" fill="${headFill}" stroke="${stroke}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      ${face}
      <circle cx="128" cy="160" r="3" fill="#fff" opacity="0.9"/>
    `;
  }

  // bear: round ears
  return `
    <circle cx="92" cy="98" r="18" fill="${headFill}" stroke="${stroke}" stroke-width="10"/>
    <circle cx="164" cy="98" r="18" fill="${headFill}" stroke="${stroke}" stroke-width="10"/>
    ${face}
  `;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const animal = url.searchParams.get("animal") ?? "dog";
  const color = url.searchParams.get("color") ?? "orange";

  const safeAnimal = ANIMALS.has(animal as any) ? animal : "dog";
  const palette = COLORS[color] ?? COLORS.orange;

  // 256x256 circle avatar. Font-independent vector icons.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <clipPath id="c"><circle cx="128" cy="128" r="120"/></clipPath>
  </defs>
  <circle cx="128" cy="128" r="120" fill="${palette.bg}"/>
  <g clip-path="url(#c)">
    <g>
      ${animalMarkup(safeAnimal, palette.fg)}
    </g>
  </g>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

