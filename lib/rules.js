// Hujjat (liga/chempionat) tuzilmasi, tozalash va ruxsatlarni tekshirish.
const cupLib = require("./cup");
const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
const sid = (v, n) => String(v == null ? "" : v).slice(0, n || 24);
const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);
const hex = (v, d) => (/^#[0-9a-fA-F]{6}$/.test(v) ? v : d);
const PATS = ["solid", "vstripes", "hstripes", "half", "chevron", "sash", "cross"];
const MAXP = 4096, MAXM = 5000;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function cleanPlayer(p) {
  p = p || {};
  return { id: str(p.id, 16), uid: sid(p.uid), name: str(p.name, 60), tg: str(p.tg, 40), team: str(p.team, 40), club: p.club ? str(p.club, 60) : null, abbr: str(p.abbr, 3), c1: hex(p.c1, "#3b82f6"), c2: hex(p.c2, "#f8fafc"), pat: PATS.includes(p.pat) ? p.pat : "solid", img: typeof p.img === "string" && p.img.startsWith("data:image/") && p.img.length <= 15000 ? p.img : null };
}
function cleanMatch(m) { m = m || {}; return { id: str(m.id, 16), h: str(m.h, 16), a: str(m.a, 16), hs: num(m.hs), as: num(m.as), ts: num(m.ts), by: sid(m.by) }; }
function cleanTie(t) {
  t = t || {};
  const o = { a: t.a ? str(t.a, 16) : null, b: t.b ? str(t.b, 16) : null, hs: num(t.hs), as: num(t.as), pen: t.pen === "h" || t.pen === "a" ? t.pen : null, w: t.w ? str(t.w, 16) : null };
  if (t.bye) o.bye = true;
  if (t.walkover) o.walkover = true;
  if (num(t.ts) != null) o.ts = t.ts;
  if (t.by) o.by = sid(t.by);
  if (t.pending && typeof t.pending === "object") o.pending = { hs: num(t.pending.hs), as: num(t.pending.as), pen: t.pending.pen === "h" || t.pending.pen === "a" ? t.pending.pen : null, by: sid(t.pending.by), ts: num(t.pending.ts) };
  return o;
}
function clean(doc) {
  doc = doc || {};
  const cup = doc.kind === "cup";
  const o = {};
  if (cup) o.kind = "cup";
  o.name = str(doc.name, 40); o.owner = sid(doc.owner);
  o.players = (Array.isArray(doc.players) ? doc.players : []).slice(0, MAXP).map(cleanPlayer);
  o.matches = (Array.isArray(doc.matches) ? doc.matches : []).slice(0, MAXM).map(cleanMatch);
  o.mods = (Array.isArray(doc.mods) ? doc.mods : []).slice(0, 50).map((x) => sid(x));
  o.banned = (Array.isArray(doc.banned) ? doc.banned : []).slice(0, 2000).map((b) => ({ uid: sid(b && b.uid), name: str(b && b.name, 60), tg: str(b && b.tg, 40) }));
  if (doc.ic) o.ic = str(doc.ic, 16);
  if (typeof doc.h === "number") o.h = doc.h;
  if (typeof doc.img === "string" && doc.img.startsWith("data:image/") && doc.img.length <= 40000) o.img = doc.img;
  if (cup) {
    o.size = Math.max(2, Math.min(4096, parseInt(doc.size) || 2));
    o.status = ["reg", "live", "done"].includes(doc.status) ? doc.status : "reg";
    o.rounds = (Array.isArray(doc.rounds) ? doc.rounds : []).slice(0, 13).map((r) => (Array.isArray(r) ? r : []).slice(0, 2048).map(cleanTie));
    o.champion = doc.champion ? str(doc.champion, 16) : null;
    o.out = (Array.isArray(doc.out) ? doc.out : []).slice(0, 4096).map((x) => str(String(x), 16));
  }
  return o;
}
function newDoc(kind, name, size, owner) {
  const base = { name: str(name, 40), owner, players: [], matches: [], mods: [], banned: [] };
  if (kind === "cp") return Object.assign({ kind: "cup" }, base, { size: Math.max(2, Math.min(4096, parseInt(size) || 16)), status: "reg", rounds: [], champion: null, out: [], ic: "crown" });
  return base;
}
function memberIds(doc) {
  const s = new Set([doc.owner]);
  (doc.players || []).forEach((p) => p.uid && s.add(p.uid));
  (doc.mods || []).forEach((m) => s.add(m));
  return [...s].filter(Boolean);
}
function stats(doc) {
  if (doc.kind === "cup") { let n = 0; (doc.rounds || []).forEach((r) => r.forEach((t) => { if (t.w && !t.bye) n++; })); return { players_n: (doc.players || []).length, matches_n: n }; }
  return { players_n: (doc.players || []).length, matches_n: (doc.matches || []).filter((m) => m.hs != null && m.as != null).length };
}

// Qaytadi: null (ruxsat) yoki xato kodi
function validate(old, nw, ctx) {
  const uid = ctx.uid;
  const priv = !!ctx.admin || old.owner === uid;
  const staff = priv || (old.mods || []).includes(uid);
  if ((old.kind || "") !== (nw.kind || "")) return "forbidden";
  if (old.owner !== nw.owner) return "forbidden";
  const cup = old.kind === "cup";
  if (!priv) {
    for (const k of ["name", "ic", "h", "img", "size"]) if (!eq(old[k], nw[k])) return "forbidden";
    if (!eq(old.mods || [], nw.mods || [])) return "forbidden";
  }
  if (!staff && !eq(old.banned || [], nw.banned || [])) return "forbidden";
  const op = new Map((old.players || []).map((p) => [p.id, p])), np = new Map((nw.players || []).map((p) => [p.id, p]));
  if (np.size !== (nw.players || []).length) return "forbidden";
  const isBanned = (old.banned || []).some((b) => b.uid === uid);
  for (const [id, p] of np) {
    const o = op.get(id);
    if (!o) {
      if (!staff) {
        if (p.uid !== uid) return "forbidden";
        if (isBanned) return "banned";
        if (cup && (old.status !== "reg" || (old.players || []).length >= old.size)) return "closed";
        if ((old.players || []).some((x) => x.uid === uid)) return "exists";
      }
    } else if (!staff && !eq(o, p) && o.uid !== uid) return "forbidden";
  }
  for (const [id, o] of op) if (!np.has(id) && !staff && o.uid !== uid) return "forbidden";
  const mine = (id) => { const p = np.get(id) || op.get(id); return !!p && p.uid === uid; };
  if (!cup) {
    const om = new Map((old.matches || []).map((m) => [m.id, m])), nm = new Map((nw.matches || []).map((m) => [m.id, m]));
    for (const [id, m] of nm) {
      const o = om.get(id);
      if (!o) { if (!staff && !(mine(m.h) || mine(m.a))) return "forbidden"; }
      else if (!eq(o, m) && !staff && !(o.by === uid || mine(o.h) || mine(o.a))) return "forbidden";
    }
    for (const [id, o] of om) if (!nm.has(id) && !staff && !(o.by === uid || mine(o.h) || mine(o.a))) return "forbidden";
  } else if (!staff) {
    if (old.status !== nw.status || (old.champion || null) !== (nw.champion || null) || !eq(old.out || [], nw.out || [])) return "forbidden";
    const or = old.rounds || [], nr = nw.rounds || [];
    if (or.length !== nr.length) return "forbidden";
    for (let r = 0; r < or.length; r++) {
      if (or[r].length !== nr[r].length) return "forbidden";
      for (let k = 0; k < or[r].length; k++) {
        const a = Object.assign({}, or[r][k]), b = Object.assign({}, nr[r][k]);
        delete a.pending; delete b.pending;
        if (!eq(a, b)) return "forbidden";
        if (!eq(or[r][k].pending || null, nr[r][k].pending || null)) {
          const t = or[r][k];
          if (t.w || !(mine(t.a) || mine(t.b))) return "forbidden";
          if (nr[r][k].pending && nr[r][k].pending.by !== uid) return "forbidden";
        }
      }
    }
  }
  return null;
}
// Foydalanuvchini hamma joydan chiqarish (admin/ban uchun)
function kickFromDoc(doc, uid) {
  const ids = (doc.players || []).filter((p) => p.uid === uid).map((p) => p.id);
  if (!ids.length && !(doc.mods || []).includes(uid)) return false;
  doc.mods = (doc.mods || []).filter((m) => m !== uid);
  if (doc.kind === "cup" && doc.status !== "reg") { ids.forEach((id) => cupLib.dq(doc, id)); }
  else { doc.players = (doc.players || []).filter((p) => !ids.includes(p.id)); doc.matches = (doc.matches || []).filter((m) => !ids.includes(m.h) && !ids.includes(m.a)); }
  return true;
}
module.exports = { clean, newDoc, memberIds, stats, validate, kickFromDoc, eq };
