# 🎬 YouTube Shorts Generator

AI ile otomatik dikey (9:16) YouTube Shorts üretir:

**Konu gir → Claude hikayeyi yazar → ElevenLabs seslendirir → Replicate (Flux) görselleri üretir → Creatomate videoyu render eder → indir.**

## Teknoloji
- **Next.js** (App Router) — Netlify üzerinde yayında
- **Supabase** — veritabanı, kullanıcı girişi, medya depolama
- **Claude (Opus 4.8)** — hikaye/senaryo
- **ElevenLabs** — seslendirme (Türkçe, multilingual v2)
- **Replicate / Flux** — AI görseller
- **Creatomate** — bulut video render

## Kurulum

### 1. Bağımlılıklar
```bash
npm install
```

### 2. Supabase
1. supabase.com'da proje aç.
2. **SQL Editor**'da `supabase/schema.sql` dosyasını çalıştır (tablo + storage bucket + RLS).
3. **Authentication → Providers → Email**'i aç (şifreyle giriş için "Confirm email"i kapatabilirsin).

### 3. Ortam değişkenleri
`.env.example` dosyasını `.env.local` olarak kopyala ve doldur:
```bash
cp .env.example .env.local
```
Gerekli anahtarlar: Supabase URL + anon + service role, `ANTHROPIC_API_KEY`,
`ELEVENLABS_API_KEY` (+ `ELEVENLABS_VOICE_ID`), `REPLICATE_API_TOKEN`, `CREATOMATE_API_KEY`.

### 4. Lokal çalıştır
```bash
npm run dev
```
http://localhost:3000 → kayıt ol → Short üret.

## Netlify'a deploy
1. Kodu GitHub'a push'la.
2. Netlify → **Add new site → Import from GitHub**.
3. **Site settings → Environment variables**: `.env.local`'daki tüm değişkenleri ekle
   (`NEXT_PUBLIC_SITE_URL`'i gerçek Netlify adresinle güncelle).
4. Deploy. Render işi `netlify/functions/generate-background.ts` background
   fonksiyonunda (15 dk'ya kadar) çalışır.

## Pipeline akışı
`app/api/videos` (POST) → iş kaydı oluşturur → background fonksiyon
`lib/pipeline/run.ts`'i çalıştırır → her adım `videos` tablosuna durum yazar →
arayüz 3 sn'de bir poll'layıp ilerlemeyi gösterir.
