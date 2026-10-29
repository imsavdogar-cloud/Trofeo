// Egasi uchun alohida boshqaruv paneli API (faqat ADMIN_IDS dagi Telegram akkauntlar).
// POST { initData, action, ... }
const db = require("../lib/db");
const { call } = require("../lib/tg");
const { authed } = require("../lib/auth");
const rules = require("../lib/rules");

async function all(table, sel, extra) {
  const out = [];
  for (let off = 0; off < 100000; off += 1000) {
    const rows = await db.get(table, `select=${sel}${extra ? "&" + extra : ""}&limit=1000&offset=${off}`);
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}
const log = (admin, action, target, note) => db.insert("admin_log", { admin_id: admin, action, target: String(target || ""), note: String(note || "").slice(0, 300) }).catch(() => null);
const brief = (r, names, fol) => ({ id: r.id, kind: r.kind, name: r.name, owner: r.owner, owner_name: names[r.owner] || "", players_n: r.players_n, matches_n: r.matches_n, followers: fol[r.id] || 0, frozen: r.frozen, freeze_reason: r.freeze_reason, deleted_at: r.deleted_at, created_at: r.created_at, updated_at: r.updated_at });

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const b = req.body || {};
  if (!db.configured()) return res.status(200).json({ ok: false, configured: false });
  let a;
  try { a = await authed(req, {}); } catch (e) { return res.status(500).json({ ok: false, error: "db", detail: String(e.message).slice(0, 200) }); }
  if (a.err) return res.status(a.err.code).json(Object.assign({ ok: false }, a.err));
  if (!a.admin) return res.status(403).json({ ok: false, error: "forbidden" });
  const now = Date.now(), iso = () => new Date().toISOString();
  try {
    switch (b.action) {
      case "overview": {
        const users = await all("users", "id,name,lang,first_seen,last_seen,banned_until,follows");
        const lg = await all("leagues", "id,kind,name,owner,frozen,deleted_at,updated_at,players_n,matches_n");
        const pays = await all("payments", "nonce,kind,stars,status");
        const t = (x) => (x ? new Date(x).getTime() : 0);
        const langs = { uz: 0, ru: 0, en: 0 };
        users.forEach((u) => { langs[u.lang] = (langs[u.lang] || 0) + 1; });
        const fol = {};
        users.forEach((u) => ((u.follows && u.follows.l) || []).forEach((i) => { fol[i] = (fol[i] || 0) + 1; }));
        const live = lg.filter((l) => !l.deleted_at);
        const top = live.map((l) => ({ id: l.id, name: l.name, kind: l.kind, followers: fol[l.id] || 0, players_n: l.players_n })).sort((x, y) => y.followers - x.followers || y.players_n - x.players_n).slice(0, 8);
        return res.json({
          ok: true,
          users: { total: users.length, online: users.filter((u) => now - t(u.last_seen) < 120000).length, d1: users.filter((u) => now - t(u.last_seen) < 864e5).length, d7: users.filter((u) => now - t(u.last_seen) < 7 * 864e5).length, new7: users.filter((u) => now - t(u.first_seen) < 7 * 864e5).length, banned: users.filter((u) => u.banned_until && t(u.banned_until) > now).length, langs },
          leagues: { total: live.length, leagues: live.filter((l) => l.kind !== "cup").length, cups: live.filter((l) => l.kind === "cup").length, active7: live.filter((l) => !l.frozen && now - t(l.updated_at) < 7 * 864e5).length, frozen: live.filter((l) => l.frozen).length, deleted: lg.length - live.length },
          payments: { paid: pays.filter((p) => p.status === "paid" || p.status === "used").length, stars: pays.filter((p) => p.status === "paid" || p.status === "used").reduce((s, p) => s + p.stars, 0), refunded: pays.filter((p) => p.status === "refunded").length },
          top,
          announce: ((await db.get("meta", "key=eq.announcement&select=value"))[0] || {}).value || null,
        });
      }
      case "users": {
        const users = await all("users", "id,name,tg,lang,photo,first_seen,last_seen,banned_until,ban_reason,follows");
        const lg = await all("leagues", "id,owner,deleted_at");
        const owned = {}; lg.filter((l) => !l.deleted_at).forEach((l) => { owned[l.owner] = (owned[l.owner] || 0) + 1; });
        const q = String(b.q || "").toLowerCase().trim();
        let rows = users.filter((u) => !q || (u.name || "").toLowerCase().includes(q) || (u.tg || "").toLowerCase().includes(q) || u.id.includes(q));
        rows.sort((x, y) => new Date(y.last_seen) - new Date(x.last_seen));
        const total = rows.length; rows = rows.slice(parseInt(b.offset) || 0, (parseInt(b.offset) || 0) + (parseInt(b.limit) || 50));
        return res.json({ ok: true, total, now: iso(), users: rows.map((u) => ({ id: u.id, name: u.name, tg: u.tg, lang: u.lang, photo: u.photo, first_seen: u.first_seen, last_seen: u.last_seen, banned_until: u.banned_until, ban_reason: u.ban_reason, owned: owned[u.id] || 0, follows: ((u.follows && u.follows.l) || []).length })) });
      }
      case "user": {
        const uid = String(b.uid || "");
        const u = (await db.get("users", `id=eq.${db.enc(uid)}&select=*`))[0];
        if (!u) return res.status(404).json({ ok: false, error: "notfound" });
        const mem = await db.get("leagues", `member_ids=cs.{${db.enc(uid)}}&select=id,kind,name,owner,frozen,deleted_at,players_n,matches_n,created_at,updated_at,data`);
        const pays = await db.get("payments", `user_id=eq.${db.enc(uid)}&select=nonce,kind,stars,status,created_at&order=created_at.desc&limit=50`);
        return res.json({ ok: true, user: u, owned: mem.filter((l) => l.owner === uid).map((l) => brief(l, {}, {})), member: mem.filter((l) => l.owner !== uid).map((l) => { const p = ((l.data && l.data.players) || []).find((x) => x.uid === uid); return Object.assign(brief(l, {}, {}), { team: p ? p.team : "", mod: ((l.data && l.data.mods) || []).includes(uid) }); }), payments: pays });
      }
      case "ban": {
        const uid = String(b.uid || ""); if (!uid || uid === a.id) return res.status(400).json({ ok: false, error: "bad" });
        const days = parseInt(b.days) || 0;
        const until = days > 0 ? new Date(now + days * 864e5).toISOString() : "9999-12-31T00:00:00Z";
        const r = await db.patch("users", `id=eq.${db.enc(uid)}`, { banned_until: until, ban_reason: String(b.reason || "").slice(0, 200) });
        if (!r.length) return res.status(404).json({ ok: false, error: "notfound" });
        await log(a.id, "ban", uid, `${days || "doimiy"} kun. ${b.reason || ""}`);
        return res.json({ ok: true, banned_until: until });
      }
      case "unban": {
        const uid = String(b.uid || "");
        await db.patch("users", `id=eq.${db.enc(uid)}`, { banned_until: null, ban_reason: "" });
        await log(a.id, "unban", uid, "");
        return res.json({ ok: true });
      }
      case "kick": {
        const uid = String(b.uid || "");
        const rows = await db.get("leagues", `member_ids=cs.{${db.enc(uid)}}&deleted_at=is.null&select=id,data`);
        let n = 0;
        for (const r of rows) {
          const doc = r.data;
          if (doc.owner === uid) continue;
          if (rules.kickFromDoc(doc, uid)) { const st = rules.stats(doc); await db.patch("leagues", `id=eq.${r.id}`, { data: doc, member_ids: rules.memberIds(doc), players_n: st.players_n, matches_n: st.matches_n, updated_at: iso() }); n++; }
        }
        await log(a.id, "kick", uid, `${n} ta`);
        return res.json({ ok: true, count: n });
      }
      case "leagues": {
        const users = await all("users", "id,name,follows");
        const names = {}, fol = {};
        users.forEach((u) => { names[u.id] = u.name; ((u.follows && u.follows.l) || []).forEach((i) => { fol[i] = (fol[i] || 0) + 1; }); });
        let rows = await all("leagues", "id,kind,name,owner,frozen,freeze_reason,deleted_at,created_at,updated_at,players_n,matches_n");
        const q = String(b.q || "").toLowerCase().trim(), st = b.status || "all", kd = b.kind || "all";
        rows = rows.filter((r) => (kd === "all" || (kd === "cup") === (r.kind === "cup")) && (!q || r.name.toLowerCase().includes(q) || (names[r.owner] || "").toLowerCase().includes(q) || r.id.includes(q)));
        rows = rows.filter((r) => st === "all" ? true : st === "deleted" ? !!r.deleted_at : st === "frozen" ? (r.frozen && !r.deleted_at) : (!r.deleted_at && !r.frozen && now - new Date(r.updated_at) < 7 * 864e5));
        rows.sort((x, y) => new Date(y.updated_at) - new Date(x.updated_at));
        return res.json({ ok: true, total: rows.length, leagues: rows.slice(0, parseInt(b.limit) || 100).map((r) => brief(r, names, fol)) });
      }
      case "league": {
        const r = (await db.get("leagues", `id=eq.${db.enc(String(b.id || ""))}&select=*`))[0];
        if (!r) return res.status(404).json({ ok: false, error: "notfound" });
        const d = r.data || {};
        return res.json({ ok: true, league: { id: r.id, kind: r.kind, name: r.name, owner: r.owner, frozen: r.frozen, freeze_reason: r.freeze_reason, deleted_at: r.deleted_at, status: d.status, size: d.size, champion: d.champion, mods: d.mods || [], banned: d.banned || [], players: (d.players || []).map((p) => ({ id: p.id, uid: p.uid, name: p.name, tg: p.tg, team: p.team })), created_at: r.created_at, updated_at: r.updated_at } });
      }
      case "freeze": case "unfreeze": case "remove": case "restore": {
        const id = String(b.id || "");
        const patch = { updated_at: iso() };
        if (b.action === "freeze") { patch.frozen = true; patch.freeze_reason = String(b.reason || "").slice(0, 200); }
        if (b.action === "unfreeze") { patch.frozen = false; patch.freeze_reason = ""; }
        if (b.action === "remove") patch.deleted_at = iso();
        if (b.action === "restore") patch.deleted_at = null;
        const r = await db.patch("leagues", `id=eq.${db.enc(id)}`, patch);
        if (!r.length) return res.status(404).json({ ok: false, error: "notfound" });
        await log(a.id, b.action, id, b.reason || "");
        return res.json({ ok: true });
      }
      case "payments": {
        const users = await all("users", "id,name,tg");
        const names = {}; users.forEach((u) => { names[u.id] = u.name || u.tg; });
        const rows = await db.get("payments", "select=*&order=created_at.desc&limit=200");
        return res.json({ ok: true, payments: rows.map((p) => Object.assign({}, p, { user_name: names[p.user_id] || "" })) });
      }
      case "refund": {
        const p = (await db.get("payments", `nonce=eq.${db.enc(String(b.nonce || ""))}&select=*`))[0];
        if (!p || !p.charge_id) return res.status(404).json({ ok: false, error: "notfound" });
        if (p.status === "refunded") return res.status(409).json({ ok: false, error: "used" });
        const r = await call(process.env.BOT_TOKEN, "refundStarPayment", { user_id: Number(String(p.user_id).replace(/^tg/, "")), telegram_payment_charge_id: p.charge_id });
        if (!r.ok) return res.status(502).json({ ok: false, error: "telegram", detail: r.description || "" });
        await db.patch("payments", `nonce=eq.${db.enc(p.nonce)}`, { status: "refunded" });
        await log(a.id, "refund", p.nonce, `${p.stars} Stars`);
        return res.json({ ok: true });
      }
      case "announce": {
        const v = b.on ? { text: String(b.text || "").slice(0, 400), on: true, ts: now } : { text: "", on: false, ts: now };
        await db.upsert("meta", { key: "announcement", value: v }, "key");
        await log(a.id, "announce", "", v.text);
        return res.json({ ok: true, announce: v });
      }
      case "log": {
        const rows = await db.get("admin_log", "select=*&order=ts.desc&limit=200");
        return res.json({ ok: true, log: rows });
      }
      default: return res.status(400).json({ ok: false, error: "bad" });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: "db", detail: String(e.message).slice(0, 200) });
  }
};
