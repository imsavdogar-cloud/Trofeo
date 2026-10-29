// Yangi liga yoki chempionat yaratish: admin bepul, boshqalar tasdiqlangan to'lov bilan.
// POST { initData, kind:"lg"|"cp", name, size, nonce }
const db = require("../lib/db");
const { authed } = require("../lib/auth");
const rules = require("../lib/rules");

const code = () => { const a = "abcdefghjkmnpqrstuvwxyz23456789"; let s = ""; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const b = req.body || {};
  if (!db.configured()) return res.status(200).json({ ok: false, configured: false });
  let a;
  try { a = await authed(req, { lang: b.lang }); } catch (e) { return res.status(500).json({ ok: false, error: "db", detail: String(e.message).slice(0, 200) }); }
  if (a.err) return res.status(a.err.code).json(Object.assign({ ok: false }, a.err));
  const k = b.kind === "cp" ? "cp" : "lg";
  const name = String(b.name || "").trim().slice(0, 40);
  if (!name) return res.status(400).json({ ok: false, error: "name" });
  const size = k === "cp" ? parseInt(b.size) : 0;
  if (k === "cp" && !(size >= 2 && size <= 4096)) return res.status(400).json({ ok: false, error: "size" });
  try {
    let nonce = null;
    if (!(a.admin && !b.nonce)) {
      nonce = String(b.nonce || "");
      if (!/^[a-f0-9]{10}$/.test(nonce)) return res.status(402).json({ ok: false, error: "payment" });
      const rows = await db.get("payments", `nonce=eq.${nonce}&user_id=eq.${db.enc(a.id)}&kind=eq.${k}&select=status`);
      if (!rows[0]) return res.status(402).json({ ok: false, error: "payment" });
      if (rows[0].status === "used") return res.status(409).json({ ok: false, error: "used" });
      if (rows[0].status !== "paid") return res.status(202).json({ ok: false, pending: true });
      // Atomik: faqat bitta so'rov "paid" holatni "used" ga o'tkaza oladi
      const took = await db.patch("payments", `nonce=eq.${nonce}&status=eq.paid`, { status: "used" });
      if (!took.length) return res.status(409).json({ ok: false, error: "used" });
    }
    const doc = rules.newDoc(k, name, size, a.id);
    let row = null;
    for (let i = 0; i < 5 && !row; i++) {
      const id = code();
      try {
        const st = rules.stats(doc);
        row = (await db.insert("leagues", { id, kind: k === "cp" ? "cup" : "league", name: doc.name, owner: a.id, data: doc, member_ids: rules.memberIds(doc), players_n: st.players_n, matches_n: st.matches_n }))[0];
      } catch (e) { if (!(e.status === 409 || e.code === "23505")) throw e; }
    }
    if (!row) return res.status(500).json({ ok: false, error: "db", detail: "kod yaratilmadi" });
    if (nonce) await db.patch("payments", `nonce=eq.${nonce}`, { ref_id: row.id });
    return res.status(200).json({ ok: true, id: row.id, doc: row.data, rev: row.updated_at });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "db", detail: String(e.message).slice(0, 200) });
  }
};
