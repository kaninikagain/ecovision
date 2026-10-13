# EcoVision Mini AI (Next-Gen Native Next.js Edition)

A high-performance, security-hardened Next.js application converting the previous FastAPI + vanilla HTML prototype into a unified, full-stack Next.js web application.

---

## 🚀 Key Improvements & Architecture

### 1. Unified Next.js Architecture
- **Inbuilt Routing (App Router)**: Fully native API routes replace the Python backend with zero external server dependencies:
  - `GET /api/health`: Health status, active AI provider, model identifier, and key verification.
  - `GET /api/rules`: Dynamic campus waste sorting rules and bin mappings.
  - `GET /api/stats`: Real-time aggregated campus scan statistics.
  - `POST /api/analyse`: High-performance multithreaded AI waste classification route.
- **Client & Server Separation**: All API keys are strictly kept on the server side in `.env.local` and never exposed to client bundles.

### 2. Gemini Client & Anti-Jailbreak Hardening
- **Proper Gemini Client Object**: Uses official `@google/generative-ai` and `@google/genai` client instances with automatic failover.
- **Strict JSON Schema Enforcement**:
  - `responseMimeType: "application/json"`
  - Strict `responseSchema` enforcing `item_name`, `category` (enum: `recyclable`, `organic`, `hazardous`, `general`, `unsure`), `explanation`, and `uncertainty_flag`.
- **System Instructions with Anti-Jailbreak Protection**:
  - Explicit directives forbidding role reassignment, jailbreaks, and prompt injection.
  - Treats any text or commands inside scanned images strictly as object packaging labels, ignoring embedded prompts or instruction injections.
- **Hyperparameter Optimization**:
  - `temperature: 0.1` for deterministic classification.
  - `topP: 0.8`, `topK: 40`, and `maxOutputTokens: 300` tailored for concise explanations (< 20 words).

### 3. In-Memory Sliding Window Rate Limiting
- **Anti-Abuse Protection**: In-memory sliding window rate limiter (`lib/rate-limiter.ts`) enforcing configurable requests-per-minute limits (default: 20/min per IP).
- **Zero Memory Leaks**: Automatically evicts stale IP buckets every 2 minutes.
- **Standard HTTP Headers**: Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` on `HTTP 429`.

### 4. Advanced Security Hardening
- **Pre-applied Security Headers in `next.config.js`**:
  - `Content-Security-Policy` (CSP)
  - `Strict-Transport-Security` (HSTS with preload)
  - `X-Frame-Options: DENY` (anti-clickjacking)
  - `X-Content-Type-Options: nosniff` (anti-MIME confusion)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
  - `X-XSS-Protection: 1; mode=block`
- **MIME Magic Bytes Sniffing**: Inspects true binary signatures (`FF D8` for JPEG, `89 50 4E 47` for PNG, `RIFF...WEBP` for WebP), rejecting spoofed or malicious polyglots with `HTTP 415`.
- **Payload Enforcements**: Validates base64 data and enforces strict max file size limit (`MAX_IMAGE_MB`, default 5MB).

### 5. UI/UX & Speed Optimizations
- **Client-Side Image Downscaling**: Canvas automatically resizes images to a maximum of 1024px at 0.85 quality before transmission, reducing payload size by ~85% and cutting upload latency dramatically.
- **Zero-CLS Font Loading**: Uses `next/font/google` for `Bricolage Grotesque` and `Figtree`.
- **Responsive Nature Design**: Preserves the sunlit botanical aesthetic, 3D waste bins, and reticle viewfinder with animated laser sweep scanline.
- **Mobile Camera Support**: Direct smartphone camera capture via `capture="environment"`.

---

## 📦 Getting Started

### 1. Install Dependencies
Ensure Node.js 18+ is installed:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your Google Gemini API key:
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
MODEL_NAME=gemma-4-31b-it
PROVIDER=gemini
RATE_PER_MIN=20
MAX_IMAGE_MB=5
LOG_SCANS=0
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```
