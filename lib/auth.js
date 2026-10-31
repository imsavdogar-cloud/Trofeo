// Telegram imzosini tekshirish, foydalanuvchini bazada yuritish, ban va admin tekshiruvi.
const { verify } = require("./tg");
const db = require("./db");

// Egasi: Vercel'da ADMIN_IDS (vergul bilan). Bo'sh bo'lsa, quyidagi ID egasi hisoblanadi.
const DEFAULT_OWNERS = ["482758568"];
const owners = () => {
  const e = (process.env.ADMIN_IDS || "").split(",").map((x) => x.trim()).filter(Boolean);
  return e.length ? e : DEFAULT_OWNERS;
};
const isAdminNumeric = (id) => owners().includes(String(id));
const langNorm = (l) => { l = String(l || "").toLowerCase().slice(0, 2); return ["uz", "ru", "en"].includes(l) ? l : null; };

async function authed(req, opt) {
  opt = opt || {};
  const b = req.body || {};
  const u = verify(b.initData, process.env.BOT_TOKEN);
  if (!u) return { err: { code: 401, error: "auth" } };
  const id = "tg" + u.id;
  const admin = isAdminNumeric(u.id);
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "";
  let row = null;
  if (db.configured()) {
    const rows = await db.get("users", `id=eq.${db.enc(id)}&select=*`);
    row = rows[0] || null;
    const now = new Date().toISOString();
    if (!row) {
      row = (await db.upsert("users", { id, name, tg: u.username || "", lang: langNorm(opt.lang) || langNorm(u.language_code) || "uz", photo: u.photo_url || "", first_seen: now, last_seen: now }, "id"))[0];
    } else if (opt.touch) {
      const p = { last_seen: now, name, tg: u.username || "" };
      if (u.photo_url) p.photo = u.photo_url;
      const L = langNorm(opt.lang); if (L) p.lang = L;
      row = (await db.patch("users", `id=eq.${db.enc(id)}`, p))[0] || row;
    }
    if (row.banned_until && new Date(row.banned_until) > new Date() && !admin) {
      return { err: { code: 403, error: "banned", banned: { until: row.banned_until, reason: row.ban_reason || "" } } };
    }
  }
  return { u, id, row, admin, name };
}
module.exports = { authed, owners, isAdminNumeric, langNorm };
