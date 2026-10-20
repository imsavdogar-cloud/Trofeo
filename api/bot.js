// Trofeo bot: Telegram webhook (Vercel serverless funksiyasi). Til: uz / ru / en
const TOKEN = process.env.BOT_TOKEN;
const tg = (method, body) =>
  fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

const base = (req) => process.env.APP_URL || `https://${req.headers.host}`;
const handle = () => (process.env.SUPPORT_CONTACT || "").replace(/\s*ga yozing\s*$/i, "").trim();

function langOf(m) {
  const c = String((m.from && m.from.language_code) || "").toLowerCase().slice(0, 2);
  if (!c || c === "uz") return "uz";
  if (["ru", "be", "uk", "kk", "ky", "tg"].includes(c)) return "ru";
  return "en";
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const TXT = {
  uz: {
    open: "Trofeo'ni ochish",
    btnLg: "Ligani yaratish",
    btnCp: "Chempionatni yaratish",
    contact: (h) => (h ? `${h} ga yozing` : "shu botga yozing"),
    hello: (n) => `Salom, ${n}! Trofeo'ga xush kelibsiz.\n\nDo'stlar bilan konsolda futbol o'ynang: liga yarating, natijani kiriting, jadval avtomatik yangilanadi.\n\nBoshlash uchun pastdagi tugmani bosing.`,
    invited: (n) => `Salom, ${n}! Sizni taklif qilishdi. Pastdagi tugmani bosib qo'shiling.`,
    support: (c) => `Yordam kerakmi? Savolingizni ${c}. Imkon qadar tez javob beramiz.`,
    paysupport: (c) => `To'lov bo'yicha muammo bo'lsa (to'lov o'tdi, lekin liga yoki chempionat yaratilmadi, yoki to'lov xato o'tdi), to'lov sanasini va Telegram username'ingizni ${c}. Muammo tasdiqlansa, Stars qaytariladi.`,
    terms: "Foydalanish shartlari (qisqacha):\n\n1. Trofeo do'stlar o'rtasidagi o'yin natijalarini yuritish uchun ilova.\n2. Liga va chempionat yaratish pullik (Telegram Stars). Xizmat ko'rsatilmagan yoki texnik xato bo'lgan hollarda to'lov qaytariladi.\n3. Foydalanuvchi kiritgan ma'lumotlar (jamoa nomi, natijalar) uchun o'zi javobgar.\n4. Qoidalarni buzgan foydalanuvchi ligadan chiqarilishi mumkin.",
    id: (i) => `Sizning Telegram ID'ingiz: ${i}`,
    paid: "To'lov qabul qilindi. Rahmat!",
    paidLg: "To'lov qabul qilindi. Rahmat! Ligangizni yaratish uchun tugmani bosing.",
    paidCp: "To'lov qabul qilindi. Rahmat! Chempionatingizni yaratish uchun tugmani bosing.",
    other: "Ilovani ochish uchun tugmani bosing.",
  },
  ru: {
    open: "Открыть Trofeo",
    btnLg: "Создать лигу",
    btnCp: "Создать чемпионат",
    contact: (h) => (h ? `напишите ${h}` : "напишите в этот бот"),
    hello: (n) => `Привет, ${n}! Добро пожаловать в Trofeo.\n\nИграйте в футбол на консоли с друзьями: создавайте лиги, вносите результаты, таблица обновляется автоматически.\n\nНажмите кнопку ниже, чтобы начать.`,
    invited: (n) => `Привет, ${n}! Вас пригласили. Нажмите кнопку ниже, чтобы присоединиться.`,
    support: (c) => `Нужна помощь? ${cap(c)}. Мы ответим как можно скорее.`,
    paysupport: (c) => `Если возникла проблема с оплатой (оплата прошла, но лига или чемпионат не создан, либо платёж списан по ошибке), ${c}, указав дату платежа и ваш Telegram username. Если проблема подтвердится, Stars будут возвращены.`,
    terms: "Условия использования (кратко):\n\n1. Trofeo — приложение для учёта результатов матчей между друзьями.\n2. Создание лиги и чемпионата платное (Telegram Stars). Если услуга не оказана или произошла техническая ошибка, оплата возвращается.\n3. Пользователь отвечает за вводимые данные (названия команд, результаты).\n4. Нарушителя могут исключить из лиги.",
    id: (i) => `Ваш Telegram ID: ${i}`,
    paid: "Оплата получена. Спасибо!",
    paidLg: "Оплата получена. Спасибо! Нажмите кнопку, чтобы создать лигу.",
    paidCp: "Оплата получена. Спасибо! Нажмите кнопку, чтобы создать чемпионат.",
    other: "Нажмите кнопку, чтобы открыть приложение.",
  },
  en: {
    open: "Open Trofeo",
    btnLg: "Create league",
    btnCp: "Create tournament",
    contact: (h) => (h ? `write to ${h}` : "write to this bot"),
    hello: (n) => `Hi, ${n}! Welcome to Trofeo.\n\nPlay console football with friends: create leagues, enter results and the table updates automatically.\n\nTap the button below to get started.`,
    invited: (n) => `Hi, ${n}! You've been invited. Tap the button below to join.`,
    support: (c) => `Need help? ${cap(c)}. We'll reply as soon as possible.`,
    paysupport: (c) => `If there is a problem with a payment (it went through but the league or tournament wasn't created, or you were charged by mistake), ${c} with the payment date and your Telegram username. If the problem is confirmed, the Stars will be refunded.`,
    terms: "Terms of use (short):\n\n1. Trofeo is an app for keeping match results between friends.\n2. Creating a league or tournament is paid (Telegram Stars). If the service isn't delivered or a technical error occurs, the payment is refunded.\n3. Users are responsible for the data they enter (team names, results).\n4. Users who break the rules may be removed from a league.",
    id: (i) => `Your Telegram ID: ${i}`,
    paid: "Payment received. Thank you!",
    paidLg: "Payment received. Thank you! Tap the button to create your league.",
    paidCp: "Payment received. Thank you! Tap the button to create your tournament.",
    other: "Tap the button to open the app.",
  },
};

const openBtn = (url, text) => ({ inline_keyboard: [[{ text, web_app: { url } }]] });

async function onMessage(m, req) {
  const chat = m.chat.id;
  const text = (m.text || "").trim();
  const name = (m.from && m.from.first_name) || "";
  const L = TXT[langOf(m)];

  if (m.successful_payment) {
    const sp = m.successful_payment;
    console.log("Stars to'lovi:", sp.telegram_payment_charge_id, sp.total_amount);
    const parts = String(sp.invoice_payload || "").split(":");
    if ((parts[0] === "lg" || parts[0] === "cp") && parts[2]) {
      const cp = parts[0] === "cp";
      return tg("sendMessage", {
        chat_id: chat,
        text: cp ? L.paidCp : L.paidLg,
        reply_markup: openBtn(`${base(req)}/?paid=${parts[2]}&k=${parts[0]}`, cp ? L.btnCp : L.btnLg),
      });
    }
    return tg("sendMessage", { chat_id: chat, text: L.paid });
  }

  if (text.startsWith("/start")) {
    const code = text.split(/\s+/)[1];
    const ok = code && /^[a-z0-9]{4,12}$/i.test(code);
    const url = ok ? `${base(req)}/#${code.toLowerCase()}` : base(req);
    return tg("sendMessage", {
      chat_id: chat,
      text: ok ? L.invited(name) : L.hello(name),
      reply_markup: openBtn(url, L.open),
    });
  }
  if (text.startsWith("/id")) return tg("sendMessage", { chat_id: chat, text: L.id(m.from.id) });
  if (text.startsWith("/support")) return tg("sendMessage", { chat_id: chat, text: L.support(L.contact(handle())) });
  if (text.startsWith("/paysupport")) return tg("sendMessage", { chat_id: chat, text: L.paysupport(L.contact(handle())) });
  if (text.startsWith("/terms")) return tg("sendMessage", { chat_id: chat, text: L.terms });

  return tg("sendMessage", { chat_id: chat, text: L.other, reply_markup: openBtn(base(req), L.open) });
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
      await tg("answerPreCheckoutQuery", { pre_checkout_query_id: u.pre_checkout_query.id, ok: true });
    } else if (u.message) {
      await onMessage(u.message, req);
    }
  } catch (e) {
    console.error("bot xatosi:", e);
  }
  return res.status(200).json({ ok: true });
};
