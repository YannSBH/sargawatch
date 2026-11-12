// Importe les bulletins sargasses de Météo-France (îles du Nord, Guadeloupe, Martinique)
// et les range dans la table public.forecasts. Lancée deux fois par jour par pg_cron.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function clean(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;|&rsquo;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function paragraphs(block: string): string[] {
  return [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => clean(m[1])).filter(Boolean);
}

// Section entre un titre <h2> et le suivant
function section(html: string, title: RegExp): string {
  const parts = html.split(/<h2[^>]*>/i);
  for (const p of parts) {
    const [h, ...rest] = p.split(/<\/h2>/i);
    if (title.test(clean(h))) return rest.join("");
  }
  return "";
}

function riskOf(headline: string, text: string): "low" | "medium" | "high" | "unknown" {
  const h = headline.toLowerCase();
  const all = (headline + " " + text).toLowerCase();
  const low = /(peu ou pas|pas d.échouement|aucun|faible|anecdotique|absent|très peu|peu d.échouement)/;
  const high = /(important|massif|fort|élevé|très nombreux|record|abondant)/;
  const medium = /(modéré|moyen|quelques échouements|ponctuel|localisé|arrivage)/;
  if (low.test(h)) return "low";
  if (high.test(h)) return "high";
  if (medium.test(h)) return "medium";
  if (high.test(all)) return "high";
  if (medium.test(all)) return "medium";
  if (low.test(all)) return "low";
  return "unknown";
}

// Le bulletin ne parle-t-il que des côtes exposées (est, atlantique, au vent, sud-est) ?
function eastOnly(text: string): boolean {
  const t = text.toLowerCase();
  const east = /(\best\b|sud-est|nord-est|atlantique|au vent|côte au vent)/.test(t);
  const west = /(\bouest\b|caraïbe|sous le vent|côte sous le vent)/.test(t);
  return east && !west;
}

async function importOne(territory: string, url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "SargaWatch/1.0 (EasyLife YB)" } });
  if (!res.ok) throw new Error(`${territory}: HTTP ${res.status}`);
  const html = await res.text();
  const main = html.match(/<div id="sargasses-main">([\s\S]*?)<div id="button-container">/i)?.[1] ?? html;
  const bulletinDate = clean(main.match(/<div id="date">([\s\S]*?)<\/div>/i)?.[1] ?? "") || null;
  const conf = Number(clean(section(main, /indice de confiance/i)).match(/(\d)\s*\/\s*5/)?.[1] ?? NaN);
  const fc = paragraphs(section(main, /^prévisions? pour/i));
  const trend = paragraphs(section(main, /^tendance/i));
  if (!bulletinDate || fc.length === 0) throw new Error(`${territory}: format du bulletin non reconnu (date=${bulletinDate}, html=${html.length}, main=${main.length})`);
  const headline = fc[0];
  const forecast = fc.slice(1).join("\n");
  const risk = riskOf(headline, forecast);
  const row = {
    territory,
    bulletin_date: bulletinDate,
    confidence: Number.isFinite(conf) ? conf : null,
    headline,
    forecast,
    trend: trend.join("\n"),
    risk,
    east_only: eastOnly(headline + " " + forecast),
    fetched_at: new Date().toISOString(),
  };
  const { data: prev } = await supabase.from("forecasts").select("bulletin_date").eq("territory", territory).single();
  const changed = prev?.bulletin_date !== bulletinDate;
  const { error } = await supabase
    .from("forecasts")
    .update(changed ? { ...row, changed_at: new Date().toISOString() } : row)
    .eq("territory", territory);
  if (error) throw error;
  return { territory, bulletinDate, risk, changed };
}

Deno.serve(async () => {
  const { data: sources, error } = await supabase.from("forecasts").select("territory, source_url");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const results = await Promise.allSettled(sources!.map((s) => importOne(s.territory, s.source_url)));
  const out = results.map((r) => (r.status === "fulfilled" ? r.value : { error: String(r.reason) }));
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
