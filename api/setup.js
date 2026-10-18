// Bir martalik sozlash: webhook va menyu tugmasini o'rnatadi.
// Ochish: https://SAYT-MANZILI/api/setup?key=SETUP_KEY
const TOKEN = process.env.BOT_TOKEN;
const tg = (method, body) =>
  fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

module.exports = async (req, res) => {
  const key = (req.query && req.query.key) || "";
  if (!process.env.SETUP_KEY || key !== process.env.SETUP_KEY) {
    return res.status(401).json({ ok: false, error: "kalit noto'g'ri" });
  }
  if (!TOKEN) return res.status(500).json({ ok: false, error: "BOT_TOKEN kiritilmagan" });
  const base = process.env.APP_URL || `https://${req.headers.host}`;
  const webhook = await tg("setWebhook", {
    url: `${base}/api/bot`,
    secret_token: process.env.WEBHOOK_SECRET || undefined,
    allowed_updates: ["message", "pre_checkout_query"],
  });
  const menu = await tg("setChatMenuButton", {
    menu_button: { type: "web_app", text: "Trofeo", web_app: { url: base } },
  });
  return res.status(200).json({ webhook, menu, url: `${base}/api/bot` });
};
