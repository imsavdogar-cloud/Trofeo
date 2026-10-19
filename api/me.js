// Telegram Mini App foydalanuvchisini tekshiradi (imzo orqali) va admin ekanini aytadi.
// Vercel'da kerakli o'zgaruvchilar: BOT_TOKEN, ADMIN_IDS (vergul bilan, masalan: 123456789,987654321)
const crypto = require("crypto");

function verify(initData, token) {
  if (!initData || !token) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get("hash");
  if (!hash) return null;
  p.delete("hash");
  const data = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const h = crypto.createHmac("sha256", secret).update(data).digest("hex");
  const a = Buffer.from(h), b = Buffer.from(hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const auth = Number(p.get("auth_date"));
  if (!auth || Date.now() / 1000 - auth > 86400) return null; // 24 soatdan eski bo'lsa rad
  try { return JSON.parse(p.get("user")); } catch (e) { return null; }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const u = verify((req.body || {}).initData, process.env.BOT_TOKEN);
  if (!u) return res.status(401).json({ ok: false });
  const admins = (process.env.ADMIN_IDS || "").split(",").map((x) => x.trim()).filter(Boolean);
  return res.status(200).json({
    ok: true,
    user: { id: u.id, first_name: u.first_name, last_name: u.last_name, username: u.username, photo_url: u.photo_url },
    isAdmin: admins.includes(String(u.id)),
  });
};
