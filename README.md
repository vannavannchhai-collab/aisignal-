# ⚡ AISIGNAL BYPASS PRO

> **All-in-One Link Bypass Web App — គម្រោងពេលលេញ ធំបំផុត!**
> Bypass short links • Unshorten URLs • Remove tracking • Safety checker • Redirect tracer • Bulk bypass • QR • Free API
> 🇰🇭 Khmer + 🇺🇸 English • 🎮 Gaming RGB design • ✅ Free, no sign-up

---

## 🔥 មុខងារ / Features

| មុខងារ | ការពិពណ៌នា |
|---|---|
| 🚀 **Single Bypass** | Paste link → ទទួល Link ពិតក្នុងប៉ុន្មានវិនាទី ជាមួយ redirect chain ពេញលេញ |
| 📦 **Bulk Bypass** | Bypass រហូតដល់ 20 links ក្នុងពេលតែមួយ + Export CSV/TXT |
| 🧹 **URL Cleaner** | លុប trackers 50+ ប្រភេទ (`utm_*`, `fbclid`, `gclid`, `si`...) + ច្បាប់ពិសេស YouTube/Amazon/X |
| 🛡️ **Safety Checker** | ពិន្ទុសុវត្ថិភាព 0–100 ជាមួយហេតុផលជាភាសាខ្មែរ/អង់គ្លេស (រក link បោកប្រាស់/ក្លែងបន្លំម៉ាក) |
| 🔁 **Redirect Tracer** | មើលរាល់ជំហាន redirect ជាមួយ HTTP status |
| 👁️ **Link Preview** | ចំណងជើង, រូបភាព OG, ការពិពណ៌នា, favicon មុនពេលបើក |
| 🔍 **Candidate Extractor** | ទាញយក link គោលដៅពីទំព័រ interstitial (meta-refresh, JS redirect, skip button) |
| 📱 **QR Generator** | បង្កើត QR code សម្រាប់ final link |
| 🕘 **History + Favorites** | រក្សាទុកក្នុង browser របស់អ្នក (localStorage), ស្វែងរក/លុប/⭐ |
| 📊 **Live Stats** | Dashboard + chart Top Domains + សកម្មភាពចុងក្រោយ |
| 💻 **Free REST API** | 9 endpoints សម្រាប់ Developer |
| 🌐 **100+ Supported Domains** | bit.ly, tinyurl, ouo.io, adf.ly, linkvertise, exe.io, shorte.st, t.co, youtu.be... |
| 🇰🇭/🇺🇸 **KM/EN Toggle** | ប្តូរភាសាពេញទាំង UI |
| 🔗 **Deep Link** | `/?url=https://bit.ly/xxx` — bypass ដោយស្វ័យប្រវត្តិ (ធ្វើ bookmarklet បាន) |

## 🚀 របៀបដំណើរការ / Quick Start

```bash
npm install
npm start
# ⚡ AISIGNAL BYPASS PRO running at http://localhost:3000
```

បើក browser ទៅ **http://localhost:3000** — Paste link ហើយចុច **BYPASS NOW!** 🎉

## 💻 API

```bash
curl -X POST http://localhost:3000/api/bypass \
  -H "Content-Type: application/json" \
  -d '{"url":"https://bit.ly/xxxx"}'
```

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/bypass` | Bypass 1 URL → finalUrl, chain, metadata, safety |
| POST | `/api/bulk` | Bypass ≤20 URLs `{"urls":[...]}` |
| POST | `/api/clean` | Remove tracking params only |
| POST | `/api/safety` | Safety score only |
| POST | `/api/trace` | Redirect chain only |
| GET | `/api/qr?text=URL` | QR code data-URL |
| GET | `/api/supported?q=&category=` | Supported domains |
| GET | `/api/stats` | System statistics |
| GET | `/api/health` | Health check |

## 📁 រចនាសម្ព័ន្ធគម្រោង / Project Structure

```
.
├── server.js                 # Express server (binds 0.0.0.0:$PORT)
├── src/
│   ├── config.js
│   ├── routes/api.js         # All REST endpoints
│   ├── services/
│   │   ├── bypassService.js  # Redirect following + unwrapping + extraction
│   │   └── metadataService.js# OG metadata + candidate link extraction
│   ├── utils/
│   │   ├── security.js       # SSRF protection (blocks private IPs/metadata)
│   │   ├── cleaner.js        # Tracking-param removal rules
│   │   ├── safety.js         # Safety scoring heuristics
│   │   ├── supported.js      # 100+ domain catalogue
│   │   ├── cache.js          # In-memory TTL cache
│   │   └── stats.js          # In-memory statistics
│   └── middleware/           # rateLimit + errorHandler
├── public/
│   ├── index.html            # SPA (8 pages)
│   ├── css/style.css         # Gaming RGB theme
│   └── js/                   # app.js + i18n.js (KM/EN)
└── test/smoke.js             # npm test
```

## 🔒 សុវត្ថិភាព / Security

- **SSRF protection:** រាល់ redirect hop ត្រូវផ្ទៀងផ្ទាត់ — ទប់ស្កាត់ `localhost`, private IP ranges, cloud-metadata (`169.254.169.254`) និង DNS answers ដែលចង្អុលទៅ private IP
- Only `http/https`; URLs ជាមួយ embedded credentials ត្រូវទប់ស្កាត់
- Rate-limit 60 req/min/IP • Fetch timeout 9s • អាន HTML អតិបរមា 2MB
- History របស់អ្នកប្រើរក្សានៅក្នុង browser តែប៉ុណ្ណោះ — server មិនរក្សាទុក full URLs ទេ

## ⚠️ ការប្រើប្រាស់ដោយស្របច្បាប់ / Legal Use

ឧបករណ៍នេះតាមដានតែ **public redirects** និងស្រង់ link គោលដៅដែលគេហទំព័របង្ហាញជាសាធារណៈប៉ុណ្ណោះ។
សូមប្រើសម្រាប់ Link ដែលអ្នកមានសិទ្ធិចូលប្រើតែប៉ុណ្ណោះ។ **មិនត្រូវ** ប្រើដើម្បីរំលងការចូលគណនី, paywall, DRM ឬការការពាររក្សាសិទ្ធិឡើយ។
គេហទំព័រខ្លះតម្រូវ CAPTCHA/ជំហានរបស់មនុស្ស — ឧបករណ៍នឹងបង្ហាញ *Candidate Links* ជំនួសឱ្យការរំលងវិធានការបច្ចេកទេសបែបនោះ។

## 🚢 Deploy

ដំណើរការនៅគ្រប់កន្លែងដែលមាន Node ≥18 (Render, Railway, VPS, Docker...):

```bash
PORT=3000 npm start
```

> **Troubleshooting:** បើដំណើរការនៅពីក្រោយ TLS-intercepting proxy (error `UNABLE_TO_VERIFY_LEAF_SIGNATURE`) សូមចាប់ផ្តើមដោយ៖
> `NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt npm start` — កុំបិទ TLS verification ឱ្យសោះ។

---

⚡ **AISIGNAL BYPASS PRO** — Made with ❤️ in Cambodia 🇰🇭
