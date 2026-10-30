// Ilova holati: foydalanuvchi, uning ligalari/chempionatlari, kuzatuvlar, e'lon.
// POST { initData, lang, have:{id:rev}, watch:[id], follows:{l:[],t:[]} }
const db = require("../lib/db");
const { authed } = require("../lib/auth");
const COLS = "id,kind,name,owner,data,frozen,freeze_reason,updated_at";
const idList = (a, n) => (Array.isArray(a) ? a : []).map(String).filter((x) => /^[a-z0-9]{4,12}$/.test(x)).slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const b = req.body || {};
  let a;
  try { a = await authed(req, { touch: true, lang: b.lang }); } catch (e) { return res.status(500).json({ ok: false, error: "db", detail: String(e.message).slice(0, 200) }); }
  if (a.err) return res.status(a.err.code).json(Object.assign({ ok: false }, a.err));
  const user = { id: a.u.id, first_name: a.u.first_name, last_name: a.u.last_name, username: a.u.username, photo_url: a.u.photo_url };
  if (!db.configured()) return res.status(200).json({ ok: true, configured: false, user, isAdmin: a.admin });
  try {
    let follows = (a.row && a.row.follows) || { l: [], t: [] };
    if (b.follows && typeof b.follows === "object") {
      follows = { l: idList(b.follows.l, 200), t: (Array.isArray(b.follows.t) ? b.follows.t : []).map(String).slice(0, 400) };
      await db.patch("users", `id=eq.${db.enc(a.id)}`, { follows });
    }
    if (b.light) return res.status(200).json({ ok: true, configured: true, user, isAdmin: a.admin });
    const extraIds = new Set([...idList(follows.l, 200), ...idList(b.watch, 20)]);
    let rows = await db.get("leagues", `member_ids=cs.{${db.enc(a.id)}}&deleted_at=is.null&select=${COLS}`);
    const extra = [...extraIds].filter((i) => !rows.some((r) => r.id === i));
    if (extra.length) rows = rows.concat(await db.get("leagues", `id=in.(${extra.join(",")})&deleted_at=is.null&select=${COLS}`));
    const have = b.have && typeof b.have === "object" ? b.have : {};
    const leagues = {}, ids = [];
    for (const r of rows) {
      ids.push(r.id);
      if (have[r.id] !== r.updated_at) leagues[r.id] = { doc: r.data, rev: r.updated_at, frozen: !!r.frozen, reason: r.freeze_reason || "" };
    }
    const m = await db.get("meta", "key=eq.announcement&select=value");
    return res.status(200).json({ ok: true, configured: true, user, isAdmin: a.admin, lang: a.row && a.row.lang, ids, leagues, follows, announce: (m[0] && m[0].value) || null });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "db", detail: String(e.message).slice(0, 200) });
  }
};
