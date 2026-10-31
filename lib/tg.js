// Umumiy yordamchilar: Telegram imzosini tekshirish va Bot API ga so'rov.
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
  if (!auth || Date.now() / 1000 - auth > 86400) return null;
  try { return JSON.parse(p.get("user")); } catch (e) { return null; }
}

const call = (token, method, body) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
  }).then((r) => r.json());

module.exports = { verify, call };
