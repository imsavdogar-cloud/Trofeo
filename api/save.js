// Ligani/chempionatni yangilash yoki o'chirish (egasi/admin). Ruxsatlar serverda tekshiriladi.
// POST { initData, action:"save"|"delete", id, doc, base }
const db = require("../lib/db");
const { authed } = require("../lib/auth");
const rules = require("../lib/rules");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const b = req.body || {};
  if (!db.configured()) return res.status(200).json({ ok: false, configured: false });
  let a;
  try { a = await authed(req, {}); } catch (e) { return res.status(500).json({ ok: false, error: "db", detail: String(e.message).slice(0, 200) }); }
  if (a.err) return res.status(a.err.code).json(Object.assign({ ok: false }, a.err));
  const id = String(b.id || "");
  if (!/^[a-z0-9]{4,12}$/.test(id)) return res.status(400).json({ ok: false, error: "bad" });
  try {
    const rows = await db.get("leagues", `id=eq.${id}&select=id,data,owner,frozen,deleted_at,updated_at,freeze_reason`);
    const cur = rows[0];
    if (!cur || cur.deleted_at) return res.status(404).json({ ok: false, error: "notfound" });
    if (cur.frozen && !a.admin) return res.status(423).json({ ok: false, error: "frozen" });
    if (b.action === "delete") {
      if (!(a.admin || cur.owner === a.id)) return res.status(403).json({ ok: false, error: "forbidden" });
      await db.patch("leagues", `id=eq.${id}`, { deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      return res.status(200).json({ ok: true, deleted: true });
    }
    if (!b.doc || typeof b.doc !== "object") return res.status(400).json({ ok: false, error: "bad" });
    const doc = rules.clean(b.doc);
    if (JSON.stringify(doc).length > 4000000) return res.status(413).json({ ok: false, error: "too_large" });
    const err = rules.validate(cur.data, doc, { uid: a.id, admin: a.admin });
    if (err) return res.status(403).json({ ok: false, error: err });
    if (b.base !== cur.updated_at) return res.status(200).json({ ok: false, conflict: true, doc: cur.data, rev: cur.updated_at, frozen: !!cur.frozen });
    const st = rules.stats(doc);
    const now = new Date().toISOString();
    const upd = await db.patch("leagues", `id=eq.${id}&updated_at=eq.${db.enc(cur.updated_at)}`, { data: doc, name: doc.name, member_ids: rules.memberIds(doc), players_n: st.players_n, matches_n: st.matches_n, updated_at: now });
    if (!upd.length) {
      const again = await db.get("leagues", `id=eq.${id}&select=data,updated_at,frozen`);
      return res.status(200).json({ ok: false, conflict: true, doc: again[0].data, rev: again[0].updated_at });
    }
    return res.status(200).json({ ok: true, doc: upd[0].data, rev: upd[0].updated_at });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "db", detail: String(e.message).slice(0, 200) });
  }
};
