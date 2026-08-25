# ScanCraft — 100% Client-Side Barcode & QR Code Engine

A high-performance, privacy-first web application built with **Svelte 5**, **TypeScript**, **Tailwind CSS v4**, and **Vite**.

Runs **100% inside your browser** with **zero server dependencies** — video feeds, photos, and scanned records are never uploaded to any remote server.

---

## 🌟 Key Features

### 1. 📷 Live Camera Scanner
* **GPU & Hardware Acceleration**: Utilizes the browser native `BarcodeDetector` Web API when available (up to 60 FPS).
* **Cross-Browser Fallbacks**: Integrated with `@zxing/library` and `jsQR` to guarantee 100% support on iOS Safari, Android, Chrome, Firefox, and Edge.
* **Camera Hardware Controls**:
  * Flashlight / Torch toggle button.
  * Digital / Optical Zoom slider (hardware supported).
  * Front / Rear / USB External camera switcher.
  * Live laser scan reticle with corner brackets.
* **Instant Feedback**:
  * Synthesized zero-latency scan beeps using browser `AudioContext` (no audio files needed).
  * Haptic vibration feedback (`navigator.vibrate`).
  * Confetti celebration on detection.

---

### 2. 📂 Image File & Clipboard Paste Scanner
* **Drag-and-Drop Dropzone**: Drag any image file (PNG, JPG, WEBP, GIF, SVG) to decode instantly.
* **Clipboard Paste (`Ctrl + V`)**: Copy screenshots or barcode images and paste directly into the app.

---

### 3. 📦 Continuous Inventory / Batch Mode
* Designed for warehouse inventory, event ticket scanning, or bulk cataloging.
* Keeps camera streaming active while continuously tallying items and incrementing duplicate counts.
* Real-time metrics: Total Scans, Unique Items, and Duplicates.
* Instant 1-click **Export to CSV, JSON, or TXT**.

---

### 4. 🧠 Smart Content Recognition & Action Cards
Automatically detects and parses:
* **Wi-Fi Networks**: Displays SSID, security type (WPA/WEP/Open), show/hide password, and 1-click copy password.
* **Website URLs**: Previews domains, safety check, and 1-click open link.
* **vCard / MeCard Contacts**: Parses name, phone, email, company, address; 1-click download `.vcf` contact file.
* **Product Barcodes (EAN-13, UPC-A, etc.)**: 1-click search buttons for Google Search, Google Shopping, Amazon, OpenFoodFacts, and UPCitemdb.
* **Phone / SMS / Email**: Direct `tel:`, `sms:`, and `mailto:` action buttons.
* **Geolocation**: Latitude/longitude parsing with Google Maps links.
* **UPI Payment Links**: Displays merchant and amount details.

---

### 5. 🎨 2D QR Code & 1D Barcode Generator
* **2D QR Codes**: Generate custom QR codes for Plain Text, Website URLs, Wi-Fi setups, Contacts, Emails, Phones, and UPI.
* **1D Barcodes**: Generate linear barcodes using standard symbologies:
  * **Code 128** (Universal alphanumeric)
  * **EAN-13** (International retail)
  * **UPC-A** (North American retail)
  * **Code 39** (Industrial & inventory)
  * **ITF-14** (Logistics & shipping)
* **Customization**: Foreground/background color pickers, error correction levels (L/M/Q/H), live preview, and download as **PNG** or **SVG**.

---

### 6. 🕒 Offline History & Data Export
* Automatically saves scan history in browser `localStorage`.
* Search by keywords, filter by symbology format, or category (URLs, Wi-Fi, Contacts, Products).
* Star favorite scans.
* Export filtered history to **CSV**, **JSON**, or **TXT**.

---

## 🚀 Getting Started

### Development Server
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

---

## 📁 Modular Project Architecture

```
svelte-scanner/
├── src/
│   ├── lib/
│   │   ├── types.ts                      # TypeScript definitions & interfaces
│   │   ├── services/
│   │   │   ├── audio.ts                  # Web Audio API synthesizer & haptic vibration
│   │   │   ├── parser.ts                 # Smart format and content classifier
│   │   │   ├── scanner.ts                # Dual-engine barcode & QR decoding pipeline
│   │   │   └── history.ts                # LocalStorage management & CSV/JSON exporter
│   │   └── components/
│   │       ├── CameraScanner.svelte      # Live camera viewport with torch/zoom controls
│   │       ├── ImageScanner.svelte       # Drag-and-drop & clipboard paste scanner
│   │       ├── BatchInventory.svelte     # Continuous inventory scanning mode
│   │       ├── CodeGenerator.svelte      # QR & 1D Barcode generator
│   │       ├── ScanHistory.svelte        # Local history table with search & export
│   │       ├── FeaturesGuide.svelte      # Technical documentation & formats reference
│   │       └── ResultModal.svelte        # Contextual action card dialog
│   ├── App.svelte                        # Main application shell with tab navigation
│   ├── app.css                           # Tailwind CSS v4 styling & animations
│   └── main.ts                           # Svelte 5 application entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```
