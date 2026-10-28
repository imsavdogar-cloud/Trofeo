[README.md](https://github.com/user-attachments/files/34077479/README.md)
# Trofeo

Do'stlar bilan konsolda futbol (yoki istalgan o'yin) o'ynash uchun liga, chempionat (kubok), jadval va natijalar ilovasi.
Til: o'zbek, rus, ingliz. Telegram Mini App.

## Tuzilma
- `index.html` — ilovaning o'zi (bitta fayl)
- `admin/index.html` — egasi uchun alohida boshqaruv paneli (bot orqali `/admin`)
- `api/` — Vercel funksiyalari: `bot` (Telegram webhook), `setup` (bir martalik ulash), `state` (holat), `pay` (Stars to'lovi), `create` (yaratish), `save` (saqlash va ruxsatlar), `admin` (panel API)
- `lib/` — umumiy kod: Telegram imzosi, baza, ruxsat qoidalari, kubok mantiqi
- `supabase/schema.sql` — baza jadvallari (Supabase SQL Editor'da bir marta ishga tushiriladi)

## Vercel o'zgaruvchilari (Settings -> Environment Variables)
| Nomi | Nima |
|---|---|
| `BOT_TOKEN` | BotFather tokeni |
| `WEBHOOK_SECRET` | o'zingiz o'ylab topgan tasodifiy qator |
| `SETUP_KEY` | bir martalik ulash kaliti |
| `SUPABASE_URL` | Supabase -> Settings -> API -> Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase -> Settings -> API -> service_role (MAXFIY!) |
| `ADMIN_IDS` | (ixtiyoriy) egalarning Telegram ID'lari, vergul bilan. Bo'sh bo'lsa, kodda belgilangan egasi |
| `LEAGUE_STARS`, `CUP_STARS` | (ixtiyoriy) narx Stars'da. Standart 400 |
| `SUPPORT_CONTACT` | (ixtiyoriy) yordam uchun @username |

Supabase o'zgaruvchilari qo'yilmasa, ilova eski rejimda (ma'lumot qurilmada) ishlayveradi.
