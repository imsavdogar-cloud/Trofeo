// Supabase (PostgREST) bilan ishlash. Kalitlar faqat serverda (Vercel o'zgaruvchilari).
const base = () => (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const key = () => process.env.SUPABASE_SERVICE_KEY || "";
const configured = () => !!(base() && key());

async function rest(method, path, body, prefer) {
  const r = await fetch(`${base()}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key(),
      Authorization: `Bearer ${key()}`,
      "content-type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const txt = await r.text();
  let j = null;
  try { j = txt ? JSON.parse(txt) : null; } catch (e) { /* matn */ }
  if (!r.ok) {
    const err = new Error(`db ${r.status}: ${(j && (j.message || j.hint)) || txt}`);
    err.status = r.status; err.code = j && j.code;
    throw err;
  }
  return j;
}
const enc = encodeURIComponent;
module.exports = {
  configured, rest, enc,
  get: (t, q) => rest("GET", `${t}?${q}`),
  insert: (t, row) => rest("POST", t, row, "return=representation"),
  upsert: (t, row, conflict) => rest("POST", `${t}?on_conflict=${conflict}`, row, "resolution=merge-duplicates,return=representation"),
  patch: (t, q, body) => rest("PATCH", `${t}?${q}`, body, "return=representation"),
  del: (t, q) => rest("DELETE", `${t}?${q}`, null, "return=representation"),
};
