// Trofeo bot: Telegram webhook (Vercel serverless funksiyasi)
const TOKEN = process.env.BOT_TOKEN;
const tg = (method, body) =>
  fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

const base = (req) => process.env.APP_URL || `https://${req.headers.host}`;
const contact = () => process.env.SUPPORT_CONTACT || "shu botga yozing";

const openBtn = (url, text = "Trofeo'ni ochish") => ({
  inline_keyboard: [[{ text, web_app: { url } }]],
});

async function onMessage(m, req) {
  const chat = m.chat.id;
  const text = (m.text || "").trim();
  const name = (m.from && m.from.first_name) || "do'st";

  if (m.successful_payment) {
    const sp = m.successful_payment;
    console.log("Stars to'lovi:", sp.telegram_payment_charge_id, sp.total_amount);
    const parts = String(sp.invoice_payload || "").split(":");
    if (parts[0] === "lg" && parts[2]) {
      return tg("sendMessage", {
        chat_id: chat,
        text: "To'lov qabul qilindi. Rahmat! Ligangizni yaratish uchun tugmani bosing.",
        reply_markup: openBtn(`${base(req)}/?paid=${parts[2]}`, "Ligani yaratish"),
      });
    }
    return tg("sendMessage", { chat_id: chat, text: "To'lov qabul qilindi. Rahmat!" });
  }

  if (text.startsWith("/start")) {
    const code = text.split(/\s+/)[1];
    const url = code && /^[a-z0-9]{4,12}$/i.test(code) ? `${base(req)}/#${code.toLowerCase()}` : base(req);
    const lines = code
      ? `Salom, ${name}! Sizni ligaga taklif qilishdi. Pastdagi tugmani bosib qo'shiling.`
      : `Salom, ${name}! Trofeo'ga xush kelibsiz.\n\nDo'stlar bilan konsolda futbol o'ynang: liga yarating, natijani kiriting, jadval avtomatik yangilanadi.\n\nBoshlash uchun pastdagi tugmani bosing.`;
    return tg("sendMessage", { chat_id: chat, text: lines, reply_markup: openBtn(url) });
  }

  if (text.startsWith("/id")) {
    return tg("sendMessage", { chat_id: chat, text: `Sizning Telegram ID'ingiz: ${m.from.id}` });
  }

  if (text.startsWith("/support")) {
    return tg("sendMessage", {
      chat_id: chat,
      text: `Yordam kerakmi? Savolingizni ${contact()}. Imkon qadar tez javob beramiz.`,
    });
  }

  if (text.startsWith("/paysupport")) {
    return tg("sendMessage", {
      chat_id: chat,
      text:
        `To'lov bo'yicha muammo bo'lsa (to'lov o'tdi, lekin liga yaratilmadi yoki to'lov xato o'tdi), ` +
        `to'lov sanasini va Telegram username'ingizni ${contact()}. ` +
        `Muammo tasdiqlansa, Stars qaytariladi.`,
    });
  }

  if (text.startsWith("/terms")) {
    return tg("sendMessage", {
      chat_id: chat,
      text:
        "Foydalanish shartlari (qisqacha):\n\n" +
        "1. Trofeo do'stlar o'rtasidagi o'yin natijalarini yuritish uchun ilova.\n" +
        "2. Liga yaratish pullik (Telegram Stars). Xizmat ko'rsatilmagan yoki texnik xato bo'lgan hollarda to'lov qaytariladi.\n" +
        "3. Foydalanuvchi kiritgan ma'lumotlar (jamoa nomi, natijalar) uchun o'zi javobgar.\n" +
        "4. Qoidalarni buzgan foydalanuvchi ligadan chiqarilishi mumkin.",
    });
  }

  return tg("sendMessage", {
    chat_id: chat,
    text: "Ilovani ochish uchun tugmani bosing.",
    reply_markup: openBtn(base(req)),
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("Trofeo bot ishlayapti");
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.status(401).json({ ok: false });
  }
  const u = req.body || {};
  try {
    if (u.pre_checkout_query) {
      // To'lovga ruxsat (10 soniya ichida javob berish shart)
      await tg("answerPreCheckoutQuery", { pre_checkout_query_id: u.pre_checkout_query.id, ok: true });
    } else if (u.message) {
      await onMessage(u.message, req);
    }
  } catch (e) {
    console.error("bot xatosi:", e);
  }
  return res.status(200).json({ ok: true });
};
