import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Parsed = {
  year: number;
  months: Array<{
    month: number;
    commissions: { iard: number; vie: number; courtage: number; profitsExceptionnels: number };
    charges: number;
    prelevements: Record<string, number>;
  }>;
};

function toNumber(cell: string): number {
  // remove thousand separators and spaces
  const cleaned = cell.replace(/[^0-9\-.,]/g, "").replace(/\s+/g, "");
  if (!cleaned) return 0;
  // French-style numbers use space for thousands, here already removed
  return Number(cleaned.replace(/,/g, ".")) || 0;
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "docs", "comm_agence.md");
    const md = await readFile(filePath, "utf8");

    const lines = md.split(/\r?\n/);
    const parsed: Parsed[] = [];
    let currentYear: number | null = null;
    let rows: Record<string, string[]> = {};

    const flushYear = () => {
      if (!currentYear) return;
      const iard = rows["Commissions IARD"]; const vie = rows["Commissions Vie"]; const courtage = rows["Commissions Courtage"]; const charges = rows["Charges agence"]; const prevJ = rows["Prélèvements Julien"]; const prevJM = rows["Prélèvements Jean-Michel"];
      if (!iard || !vie || !courtage || !charges) { rows = {}; return; }
      const months: Parsed["months"] = [];
      for (let idx = 0; idx < 12; idx++) {
        months.push({
          month: idx + 1,
          commissions: {
            iard: toNumber(iard[idx] || "0"),
            vie: toNumber(vie[idx] || "0"),
            courtage: toNumber(courtage[idx] || "0"),
            profitsExceptionnels: 0,
          },
          charges: toNumber(charges[idx] || "0"),
          prelevements: {
            Julien: prevJ ? toNumber(prevJ[idx] || "0") : 0,
            "Jean-Michel": prevJM ? toNumber(prevJM[idx] || "0") : 0,
          },
        });
      }
      parsed.push({ year: currentYear, months });
      rows = {};
    };

    for (const line of lines) {
      const y = line.match(/^##\s*(\d{4})\s*$/);
      if (y) {
        flushYear();
        currentYear = Number(y[1]);
        continue;
      }
      if (!currentYear) continue;
      const m = line.match(/^\|\s*([^|]+?)\s*\|([\s\S]+)\|\s*$/);
      if (!m) continue;
      const label = m[1].trim();
      const values = m[2]
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if ([
        "Commissions IARD",
        "Commissions Vie",
        "Commissions Courtage",
        "Charges agence",
        "Prélèvements Julien",
        "Prélèvements Jean-Michel",
      ].includes(label)) {
        // Keep only first 12 for months (ignore Total column if present)
        rows[label] = values.slice(0, 12);
      }
    }
    flushYear();

    return NextResponse.json({ ok: true, data: parsed });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed to parse" }, { status: 500 });
  }
}


