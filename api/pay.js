// To'lov (Telegram Stars): narx, to'lov havolasi, tekshirish.
// GET -> { stars, cup }
// POST { action:"invoice", initData, kind:"lg"|"cp", lang } / { action:"claim", initData, nonce, kind }
const crypto = require("crypto");
const db = require("../lib/db");
const { verify, call } = require("../lib/tg");
const { authed } = require("../lib/auth");

const num = (v, d) => Math.max(1, parseInt(v || String(d), 10) || d);
const TXT = {
  uz: { lg: ["Yangi liga", "Trofeo'da yangi liga yaratish", "Liga yaratish"], cp: ["Yangi chempionat", "Trofeo'da yangi chempionat (kubok) yaratish", "Chempionat yaratish"] },
  ru: { lg: ["Новая лига", "Создание новой лиги в Trofeo", "Создание лиги"], cp: ["Новый чемпионат", "Создание нового чемпионата (кубка) в Trofeo", "Создание чемпионата"] },
  en: { lg: ["New league", "Create a new league in Trofeo", "League creation"], cp: ["New tournament", "Create a new knockout tournament in Trofeo", "Tournament creation"] },
};

module.exports = async (req, res) => {
  const lg = num(process.env.LEAGUE_STARS, 400);
  const cp = num(process.env.CUP_STARS || process.env.LEAGUE_STARS, 400);
  if (req.method === "GET") return res.status(200).json({ stars: lg, cup: cp, token: !!process.env.BOT_TOKEN, db: db.configured() });
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const token = process.env.BOT_TOKEN;
  const b = req.body || {};
  const act = b.action || "invoice";
  if (act === "price") return res.status(200).json({ ok: true, stars: lg, cup: cp });
  const k = b.kind === "cp" ? "cp" : "lg";
  if (act === "invoice") {
    let a;
    try { a = await authed(req, { lang: b.lang }); } catch (e) { return res.status(500).json({ ok: false, error: "db", detail: String(e.message).slice(0, 200) }); }
    if (a.err) return res.status(a.err.code).json(Object.assign({ ok: false }, a.err));
    const stars = k === "cp" ? cp : lg;
    const L = (TXT[b.lang] || TXT.uz)[k];
    const nonce = crypto.randomBytes(5).toString("hex");
    const payload = `${k}:${a.u.id}:${nonce}`;
    let r;
    try {
      r = await call(token, "createInvoiceLink", { title: L[0], description: L[1], payload, currency: "XTR", prices: [{ label: L[2], amount: stars }] });
    } catch (e) { return res.status(502).json({ ok: false, error: "telegram", detail: String(e.message).slice(0, 200) }); }
    if (!r.ok) return res.status(502).json({ ok: false, error: "telegram", detail: r.description || "havola yaratilmadi" });
    if (db.configured()) {
      try { await db.insert("payments", { nonce, user_id: a.id, kind: k, stars, status: "invoiced" }); }
      catch (e) { return res.status(500).json({ ok: false, error: "db", detail: String(e.message).slice(0, 200) }); }
    }
    return res.status(200).json({ ok: true, link: r.result, nonce, stars, kind: k });
  }
  if (act === "claim") {
    const u = verify(b.initData, token);
    if (!u) return res.status(401).json({ ok: false, error: "auth" });
    const nonce = String(b.nonce || "");
    if (!/^[a-f0-9]{10}$/.test(nonce)) return res.status(400).json({ ok: false, error: "bad" });
    if (db.configured()) {
      try {
        const rows = await db.get("payments", `nonce=eq.${nonce}&user_id=eq.${db.enc("tg" + u.id)}&select=status,kind,stars`);
        const row = rows[0];
        return res.status(200).json({ ok: true, paid: !!row && row.status === "paid" && row.kind === k, stars: row ? row.stars : 0 });
      } catch (e) { return res.status(500).json({ ok: false, error: "db", detail: String(e.message).slice(0, 200) }); }
    }
    const payload = `${k}:${u.id}:${nonce}`;
    const r = await call(token, "getStarTransactions", { limit: 100 });
    if (!r.ok) return res.status(502).json({ ok: false, error: "telegram", detail: r.description || "" });
    const list = (r.result && r.result.transactions) || [];
    const tx = list.find((t) => t.source && t.source.invoice_payload === payload);
    return res.status(200).json({ ok: true, paid: !!tx, stars: tx ? tx.amount : 0 });
  }
  return res.status(400).json({ ok: false, error: "bad" });
};
