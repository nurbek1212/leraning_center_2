# O'quv Markaz — boshqaruv tizimi (Fullstack)

Ustozlar, talabalar, fanlar, guruhlar, baholar va davomat uchun oddiy boshqaruv tizimi.

- **client/** — React 18 + Vite + TypeScript + Tailwind CSS + React Router + Axios + Recharts
- **server/** — Node.js + Express (TypeScript) + MySQL (`mysql2`, oddiy SQL) + JWT + bcrypt + Zod

## Talablar

- Node.js 18+
- **MySQL 8.0.16+** (`CHECK` cheklovi shu versiyadan ishlaydi; eski versiyada ball cheklovi e'tiborsiz qoladi)

## Ishga tushirish

### 1. Server

```bash
cd server
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

`.env` faylida MySQL parolingiz (`DB_PASSWORD`) va xohlagan `JWT_SECRET` ni yozing.

Bazani yaratish va namunaviy ma'lumotlarni yuklash:

```bash
npm run db:setup
```

Bu buyruq `database/schema.sql` va `database/seed.sql` ni bajaradi. Barcha namunaviy foydalanuvchilar parolining haqiqiy bcrypt hash'ini o'zi yaratib qo'yadi, shuning uchun alohida hash yozish shart emas.
**Diqqat:** `db:setup` mavjud jadvallarni o'chirib qaytadan yaratadi.

Serverni ishga tushirish:

```bash
npm run dev                 # http://localhost:5000
```

Production uchun: `npm run build && npm start`.

### 2. Client

Yangi terminalda:

```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

Dev rejimida `/api` so'rovlari Vite proxy orqali `localhost:5000` ga yuboriladi, shuning uchun client'ga qo'shimcha sozlama kerak emas.

## Namunaviy login va parollar

**Barcha foydalanuvchilar paroli: `Parol123`**

| Rol   | Email                | Izoh                              |
| ----- | -------------------- | --------------------------------- |
| Admin | admin@markaz.uz      | Hamma narsani boshqaradi          |
| Ustoz | odil@markaz.uz       | Matematika-A guruhi               |
| Ustoz | nargiza@markaz.uz    | English-B guruhi                  |
| Talaba | azizbek@markaz.uz   | Matematika-A                      |
| Talaba | madina@markaz.uz    | Matematika-A                      |
| Talaba | jasur@markaz.uz     | Matematika-A                      |
| Talaba | dilnoza@markaz.uz   | Matematika-A                      |
| Talaba | sardor@markaz.uz    | English-B                         |
| Talaba | malika@markaz.uz    | English-B                         |
| Talaba | bobur@markaz.uz     | English-B                         |
| Talaba | shahzoda@markaz.uz  | English-B                         |

## Imkoniyatlar

**Admin:** Dashboard (statistika, grafiklar, oylik to'lovlar, oxirgi baholar); fanlar, ustozlar, talabalar, guruhlar CRUD; **baholash mezoni**; **to'lovlar**.

- **Fan yozib kiritiladi.** Ustoz va guruh formasida fan nomi yoziladi (mavjud nomlar tavsiya sifatida chiqadi). Yo'q fan avtomatik yaratiladi; nomlar katta-kichik harfga e'tiborsiz takrorlanmaydi.
- **Baholash mezoni (fan bo'yicha).** Admin 100 ballni qismlarga bo'ladi (Dars faolligi 15, Oraliq imtihon 20, Yakuniy imtihon 30 ...), har bir qismga ball beradi va "E'lon qilish"ni bosadi. Qoidalar:
  - yig'indi 100 dan oshmaydi; e'lon qilish uchun aniq 100 bo'lishi shart;
  - e'londan keyin ustozlar faqat shu mezon bo'yicha baho qo'yadi; e'lon qilingan mezon doim 100 bo'lib turadi;
  - baho qo'yilgan qismni o'chirib bo'lmaydi, uning balli eng yuqori qo'yilgan baholdan kamaymaydi;
  - qism natijasi = shu qismdagi baholarning o'rtachasi (ball qismning maksimumidan oshmaydi), jami = qismlar yig'indisi.
- **To'lovlar.** Har guruhga oylik narx qo'yiladi. Admin qarzdorlikni ko'radi va naqd/karta/o'tkazma to'lovni qo'lda kiritadi; Payme va Click orqali to'lovlar avtomatik yoziladi.

**Ustoz:** o'z guruhlari -> talabalar ro'yxati (jami ball, davomat %) -> **talaba sahifasi**: talaba ma'lumotlari, mezon bo'yicha natija, baholar tarixi. Baho shu sahifadan qo'yiladi, talabani qayta tanlash shart emas. Davomat sana bo'yicha belgilanadi.

**Talaba:** mezon bo'yicha baholari (har fanda jami ball), davomat va **to'lovlar** (Payme / Click tugmalari).

## Mavzular va materiallar

Har bir fan ichida mavzular ro'yxati bor, har mavzuga maruza, taqdimot yoki boshqa fayl yuklanadi.

- **Admin:** Fanlar sahifasida "Mavzular" tugmasi; istalgan fanga mavzu qo'shadi, tahrirlaydi, fayl yuklaydi va o'chiradi.
- **Ustoz:** "Materiallar" bo'limida o'z fanlari (guruhi yoki biriktirilgan fani) bo'yicha mavzu va fayl qo'shadi. Faqat o'zi yuklagan materialni o'chira oladi.
- **Talaba:** "Materiallar" bo'limida faqat o'z guruhlari fanlarini ko'radi va fayllarni yuklab oladi.
- Ruxsat etilgan turlar: `pdf, ppt, pptx, doc, docx, odp, odt`; bitta fayl 10 MB gacha. Tur kengaytma va fayl boshidagi baytlar bo'yicha tekshiriladi, fayllar doim "yuklab olish" sifatida beriladi.
- Fayllar MySQL'ning o'zida (`material_files`, LONGBLOB) saqlanadi, shuning uchun Render kabi xizmatlarda alohida disk kerak emas va fayllar server qayta ishga tushganda yo'qolmaydi. Bepul baza hajmi (masalan 1 GB) cheklangan; ko'p katta fayl bo'lsa, keyinroq S3/R2 kabi saqlashga o'tish kerak bo'ladi. Baza `max_allowed_packet` qiymati 10 MB dan kichik bo'lsa, katta fayllar rad etiladi.

## Payme va Click

Onlayn to'lov faqat kalitlar `.env`ga yozilganda yoqiladi (bo'sh bo'lsa tugmalar ko'rinmaydi).

| Tizim | Webhook manzili (kassa sozlamasiga yoziladi) |
| ----- | --------------------------------------------- |
| Payme | `https://<domen>/api/payments/payme` |
| Click | `https://<domen>/api/payments/click` (Prepare va Complete uchun bir xil) |

1. `server/.env` ga `PAYME_MERCHANT_ID`, `PAYME_KEY`, `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY` ni kiriting.
2. `CLIENT_URL` ni haqiqiy front manziliga o'zgartiring (to'lovdan keyin talaba shu yerga qaytadi).
3. Kompyuteringizda sinash uchun serverga ochiq manzil kerak (masalan tunnel); provayderlar `localhost`ga murojaat qila olmaydi.
4. Payme sinovi: `PAYME_CHECKOUT_URL=https://test.paycom.uz`, kalit sifatida test kassa kaliti. Payme sandbox'dagi sinov stsenariylarini to'liq o'tkazing.

Muhim: to'lov summasi doim serverda hisoblanadi (guruh narxi minus to'langan summa). Payme summasi tiyinda, Click so'mda keladi. Har bir webhook takror yuborilsa ham to'lov ikki marta yozilmaydi. Payme buyurtmasi 12 soatdan keyin avtomatik bekor bo'ladi.

**Tekshirilmagan joy:** Payme'ga murojaat Basic avtorizatsiya (`Paycom:<KEY>`) bilan tekshiriladi. Bu ko'rinish rasmiy sahifalardan tasdiqlanmadi, shuning uchun uni albatta Payme sandbox'ida sinab ko'ring (`server/src/controllers/paymeController.ts`, `isAuthorized`).

## Xavfsizlik

- JWT autentifikatsiya; har bir endpoint faqat o'z roli uchun ochiq (`allowRoles`).
- Ustoz boshqa ustozning guruhiga baho yoki davomat qo'ya olmaydi (403); baho faqat guruh a'zosiga va e'lon qilingan mezon qismiga qo'yiladi, ball qism maksimumidan oshmaydi.
- Talaba faqat o'z ma'lumotini ko'radi (`/api/students/me/*`, `/api/payments/my`).
- To'lov yozuvlari guruh yoki talaba o'chirilganda yo'qolib ketmaydi (o'chirish bloklanadi).
- Parollar bcrypt bilan saqlanadi; barcha kiruvchi ma'lumotlar Zod bilan tekshiriladi.
- Kirishda 15 daqiqada 8 ta xato urinishdan keyin (IP+email bo'yicha) vaqtincha to'xtatiladi; IP bo'yicha umumiy chegara ham bor. Hisob server xotirasida yuritiladi (qayta ishga tushsa nolga tushadi, bir nechta nusxada alohida hisoblanadi).
- Profil sahifasida parolni o'zgartirish mumkin (kamida 8 belgi, harf va raqam). Parol o'zgargach (o'zi yoki admin tomonidan) eski tokenlar yaroqsiz bo'ladi.
- `helmet` xavfsizlik sarlavhalari yoqilgan. `NODE_ENV=production` bo'lsa, `JWT_SECRET` kamida 32 belgi bo'lishi shart, aks holda server ishga tushmaydi.
- Javob formati: `{ success, data, message }`.

## API

| Metod | Yo'l | Kim uchun |
| ----- | ---- | --------- |
| POST | `/api/auth/login` | hamma |
| POST | `/api/auth/change-password` | kirganlar |
| GET | `/api/auth/me` | kirganlar |
| GET/POST/PUT/DELETE | `/api/subjects`, `/api/teachers`, `/api/students`, `/api/groups` | admin |
| GET/PUT/DELETE | `/api/grading-schemes[/:subjectId]` | admin |
| POST | `/api/grading-schemes/:subjectId/publish`, `/unpublish` | admin |
| GET | `/api/groups/my` | ustoz |
| GET | `/api/groups/:id/students` | admin, o'z guruhi uchun ustoz |
| GET | `/api/groups/:id/students/:studentId` | admin, o'z guruhi uchun ustoz |
| GET | `/api/grades?groupId=&studentId=` | admin, ustoz (faqat o'z guruhlari) |
| POST/PUT/DELETE | `/api/grades` | ustoz (faqat o'z guruhlari) |
| GET/POST | `/api/attendance` | admin (o'qish), ustoz |
| GET | `/api/students/me/grades`, `/me/attendance` | talaba |
| GET/POST | `/api/payments`, `/api/payments/debts?period=`, `/api/payments/:id/cancel` | admin |
| GET | `/api/payments/my?period=` | talaba |
| POST | `/api/payments/checkout` | talaba (Payme/Click havolasini qaytaradi) |
| POST | `/api/payments/payme`, `/api/payments/click` | to'lov tizimlari (webhook) |
| GET | `/api/topics/my`, `/api/topics/subject/:subjectId` | ustoz, talaba (o'z fanlari); admin |
| POST/PUT/DELETE | `/api/topics/subject/:subjectId`, `/api/topics/:id` | admin, ustoz |
| POST | `/api/topics/:id/materials?kind=&title=&filename=` (fayl tanasi xom) | admin, ustoz |
| GET | `/api/materials/:id/download` | huquqi bor foydalanuvchi |
| DELETE | `/api/materials/:id` | admin, ustoz (o'zinikini) |
| GET | `/api/dashboard` | admin |

Ro'yxat endpoint'lari `?page=&limit=&search=` qabul qiladi va `{ items, total, page, limit, totalPages }` qaytaradi.

## Papkalar

```
oquv-markaz/
├── server/
│   ├── database/        schema.sql, seed.sql, migrations/ (eski bazani yangilash)
│   ├── scripts/         setup-db.ts (bazani yuklash), hash.ts (bcrypt hash)
│   └── src/             config, routes, controllers, middlewares, validators, utils, app.ts, server.ts
└── client/
    └── src/             api, components, context, hooks, layouts, pages (admin/teacher/student), routes, types
```

## Eski bazani yangilash

`npm run db:setup` jadvallarni **o'chirib qayta yaratadi**. Ma'lumotlaringizni saqlamoqchi bo'lsangiz, eski bazada tartib bilan faqat bir marta bajaring:

```bash
mysql -u root -p oquv_markaz < server/database/migrations/001_payments.sql
mysql -u root -p oquv_markaz < server/database/migrations/002_grading_and_unique_subjects.sql
mysql -u root -p oquv_markaz < server/database/migrations/003_topics_materials.sql
mysql -u root -p oquv_markaz < server/database/migrations/004_password_changed_at.sql
```

002 takroriy fan nomlarini birlashtiradi, har fanga e'lon qilingan "Umumiy baho" (100 ball) mezonini yaratadi va eski baholarni unga o'tkazadi.

## Seed.sql'ni qo'lda yuklash

`seed.sql` ichida parol hash'i `@pw` o'zgaruvchisidan olinadi. Qo'lda yuklamoqchi bo'lsangiz:

```bash
cd server
npm run db:setup -- --write-seed     # bazani yuklaydi va database/seed.standalone.sql yozadi
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.standalone.sql
```

## Til, tungi rejim va yangi dizayn

- Tillar: O'zbekcha / Русский / English (sarlavhadagi UZ-RU-EN tugmalari, tanlov brauzerda saqlanadi). Matnlar `client/src/i18n/locales/*.ts` fayllarida. Yangi til qo'shish uchun har bir faylga shu til kalitlarini qo'shing.
- Kunduzgi / tungi / tizim rejimi (sarlavhadagi tugma). Tanlov saqlanadi.
- **Eslatma:** server qaytaradigan xato xabarlari (masalan, validatsiya) hozircha faqat o'zbekcha.

## Nazoratlar (joriy / oraliq / yakuniy; test, yozma, og'zaki)

Ustoz o'z guruhi uchun nazorat yaratadi: **turi** (joriy, oraliq, yakuniy), **shakli** (onlayn test, yozma, og'zaki), sana va maksimal ball. Nazoratni baholash mezonining biror qismiga bog'lash mumkin.

- **Onlayn test:** ustoz savollarni kiritadi (har birida bitta to'g'ri javob) va vaqtni belgilaydi, so'ng testni ochadi. Talaba bitta urinishda topshiradi, server vaqtni tekshiradi, natija avtomatik hisoblanadi. **Yakuniy ballni ustoz belgilaydi** ("Avto natijani ball qilish" tugmasi yoki qo'lda).
- **Yozma / og'zaki:** ustoz ballni to'g'ridan-to'g'ri jadvalga kiritadi.
- **Baholarga o'tkazish:** nazorat mezon qismiga bog'langan bo'lsa, ballar `grades` jadvaliga o'tadi (qayta bosilsa yangilanadi, ikki marta yozilmaydi).
- Talaba to'g'ri javoblarni nazorat yopilgandan keyingina ko'radi.
- Cheklovlar: urinish davomida javoblar avtomatik saqlanmaydi (vaqt tugasa topshirilmagan ish nolga tengdir); ustoz "Urinishni bekor qilish" orqali talabaga qayta imkon bera oladi.

Mavjud bazani yangilash: `mysql -u root -p oquv_markaz < server/database/migrations/005_assessments.sql` (faqat bir marta).

## Dars jadvali va uy vazifalari

- **Dars jadvali** (ustoz va talaba): guruhlarning dars kunlari va vaqtidan haftalik jadval avtomatik tuziladi, bugungi kun ajratib ko'rsatiladi. Alohida sozlash kerak emas, guruhni yaratishda kiritilgan jadvaldan olinadi.
- **Uy vazifalari:** ustoz guruhga vazifa va muddat beradi. Talaba javobni matn ko'rinishida topshiradi (fayl yuklash yo'q). Muddatdan keyin topshirilsa "kech" deb belgilanadi. Ustoz izoh va (ixtiyoriy) ball qo'yadi; tekshirilgach javobni o'zgartirib bo'lmaydi. Uy vazifasi balli baholarga qo'shilmaydi.
- Mavjud bazani yangilash: `server/database/migrations/006_homework.sql` (bir marta, 001-005 dan keyin).
#   l e r a n i n g _ c e n t e r _ 2  
 