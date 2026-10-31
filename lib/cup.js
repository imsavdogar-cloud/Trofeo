// Kubok (chempionat) mantiqi: serverda ham, ilovada ham aynan shu kod ishlatiladi.
function nextPow2(n) { var p = 1; while (p < n) p *= 2; return p; }
function seedOrder(P) { var o = [1]; while (o.length < P) { var n = o.length * 2; o = o.flatMap(function (x) { return [x, n + 1 - x]; }); } return o; }
function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function settle(cup, r, k) {
  var t = cup.rounds[r][k]; if (t.w) return;
  var out = cup.out || [];
  var ao = t.a && out.indexOf(t.a) >= 0, bo = t.b && out.indexOf(t.b) >= 0;
  if (ao && t.b && !bo) { t.w = t.b; t.walkover = true; advance(cup, r, k); }
  else if (bo && t.a && !ao) { t.w = t.a; t.walkover = true; advance(cup, r, k); }
}
function advance(cup, r, k) {
  var t = cup.rounds[r][k];
  if (r + 1 >= cup.rounds.length) { cup.champion = t.w || null; cup.status = t.w ? "done" : "live"; return; }
  var nt = cup.rounds[r + 1][k >> 1], key = (k % 2 === 0) ? "a" : "b", prev = nt[key];
  nt[key] = t.w || null;
  if (prev !== nt[key] && (nt.w || nt.hs != null)) {
    nt.hs = nt.as = nt.pen = nt.w = null; nt.ts = null; delete nt.walkover; delete nt.pending;
    advance(cup, r + 1, k >> 1);
  }
  settle(cup, r + 1, k >> 1);
}
function drawCup(cup) {
  var pl = shuffle(cup.players.map(function (p) { return p.id; })), N = pl.length, P = nextPow2(N), ord = seedOrder(P), R = Math.log2(P);
  cup.rounds = []; cup.out = [];
  for (var r = 0; r < R; r++) { var cnt = P / Math.pow(2, r + 1), row = []; for (var i = 0; i < cnt; i++) row.push({ a: null, b: null, hs: null, as: null, pen: null, w: null }); cup.rounds.push(row); }
  for (var k = 0; k < P / 2; k++) { var sa = ord[2 * k], sb = ord[2 * k + 1], t = cup.rounds[0][k]; t.a = sa <= N ? pl[sa - 1] : null; t.b = sb <= N ? pl[sb - 1] : null; if (!t.a || !t.b) { t.w = t.a || t.b; t.bye = true; } }
  cup.status = "live"; cup.champion = null;
  cup.rounds[0].forEach(function (t, k) { if (t.w) advance(cup, 0, k); });
}
function dq(cup, pid) {
  cup.out = cup.out || []; if (cup.out.indexOf(pid) < 0) cup.out.push(pid);
  cup.rounds.forEach(function (rd, r) { rd.forEach(function (t, k) { settle(cup, r, k); }); });
}
function isOut(cup, pid) {
  if ((cup.out || []).indexOf(pid) >= 0) return true;
  var rs = cup.rounds || [];
  for (var r = 0; r < rs.length; r++) for (var k = 0; k < rs[r].length; k++) { var t = rs[r][k]; if (t.w && !t.bye && (t.a === pid || t.b === pid) && t.w !== pid) return true; }
  return false;
}
if (typeof module !== "undefined") module.exports = { nextPow2, seedOrder, shuffle, settle, advance, drawCup, dq, isOut };
