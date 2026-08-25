<script lang="ts">
  import {
    ShieldCheck,
    QrCode,
    Barcode,
    KeyRound,
    Printer,
    Coins,
    BookOpen,
    CheckCircle2,
    Calendar,
    Sparkles
  } from '@lucide/svelte';
</script>

<div class="w-full max-w-4xl mx-auto space-y-8 text-foreground">
  <!-- Hero Banner -->
  <div class="p-6 sm:p-8 rounded-none bg-primary/5 border border-border relative overflow-hidden">
    <div class="relative z-10 space-y-3">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
        <ShieldCheck class="w-3.5 h-3.5" />
        <span>Enterprise 100% Client-Side Engine • Zero Server Latency</span>
      </div>
      <h2 class="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
        Universal Barcode, QR & Authenticator Suite
      </h2>
      <p class="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
        Engineered with Svelte 5 and TypeScript. Operates at up to 60 FPS directly in your browser with hardware GPU acceleration, 2FA TOTP authentication, GS1 Checksum verification, and printable barcode studio.
      </p>
    </div>
  </div>

  <!-- Key Architecture Modules Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
    <div class="p-5 rounded-none bg-surface border border-border space-y-2">
      <div class="p-2.5 rounded-none bg-status-online-bg text-status-online border border-status-online/20 w-fit">
        <KeyRound class="w-5 h-5" />
      </div>
      <h4 class="font-bold text-sm text-foreground">2FA TOTP Authenticator</h4>
      <p class="text-muted-foreground leading-relaxed">
        Live client-side RFC 6238 time-based one-time password generator using Web Crypto API HMAC-SHA1 with real-time 30-second ticking countdown rings.
      </p>
    </div>

    <div class="p-5 rounded-none bg-surface border border-border space-y-2">
      <div class="p-2.5 rounded-none bg-primary/10 text-primary border border-primary/20 w-fit">
        <ShieldCheck class="w-5 h-5" />
      </div>
      <h4 class="font-bold text-sm text-foreground">GS1 Checksum Engine</h4>
      <p class="text-muted-foreground leading-relaxed">
        Automatic Modulus-10 checksum validation on EAN-13, EAN-8, and UPC-A barcodes to identify authentic packaging vs corrupt or mistyped barcodes.
      </p>
    </div>

    <div class="p-5 rounded-none bg-surface border border-border space-y-2">
      <div class="p-2.5 rounded-none bg-primary/10 text-primary border border-primary/20 w-fit">
        <Printer class="w-5 h-5" />
      </div>
      <h4 class="font-bold text-sm text-foreground">Print Label Studio</h4>
      <p class="text-muted-foreground leading-relaxed">
        Generates clean, printable sheets of barcode sticker labels directly to physical label printers or PDF documents.
      </p>
    </div>

    <div class="p-5 rounded-none bg-surface border border-border space-y-2">
      <div class="p-2.5 rounded-none bg-primary/10 text-primary border border-primary/20 w-fit">
        <Coins class="w-5 h-5" />
      </div>
      <h4 class="font-bold text-sm text-foreground">Crypto & Payments</h4>
      <p class="text-muted-foreground leading-relaxed">
        Parses Bitcoin, Ethereum, Solana addresses with 1-click block explorer lookups, plus UPI & EPC SEPA European bank transfer QR codes.
      </p>
    </div>

    <div class="p-5 rounded-none bg-surface border border-border space-y-2">
      <div class="p-2.5 rounded-none bg-primary/10 text-primary border border-primary/20 w-fit">
        <Calendar class="w-5 h-5" />
      </div>
      <h4 class="font-bold text-sm text-foreground">Calendar & vCard Cards</h4>
      <p class="text-muted-foreground leading-relaxed">
        Parses full iCalendar events (.ics) and address book contact cards (.vcf) with 1-click download directly to your mobile device or desktop.
      </p>
    </div>

    <div class="p-5 rounded-none bg-surface border border-border space-y-2">
      <div class="p-2.5 rounded-none bg-primary/10 text-primary border border-primary/20 w-fit">
        <BookOpen class="w-5 h-5" />
      </div>
      <h4 class="font-bold text-sm text-foreground">ISBN & Product Lookups</h4>
      <p class="text-muted-foreground leading-relaxed">
        Identifies Book ISBNs with direct links to OpenLibrary and Amazon, plus retail lookups on Google Shopping, OpenFoodFacts, and UPCitemdb.
      </p>
    </div>
  </div>

  <!-- Supported Symbologies Reference Table -->
  <div class="bg-surface border border-border rounded-none p-6 shadow-xl space-y-4">
    <h3 class="text-base font-bold text-foreground flex items-center gap-2">
      <Sparkles class="w-4 h-4 text-primary" />
      <span>Supported 1D Barcode & 2D QR Symbologies</span>
    </h3>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
      <div class="p-4 rounded-none bg-background border border-border space-y-2">
        <div class="font-semibold text-primary flex items-center gap-1.5 text-xs uppercase tracking-wider">
          <QrCode class="w-3.5 h-3.5" />
          <span>2D Matrix Symbologies</span>
        </div>
        <ul class="space-y-1.5 text-muted-foreground">
          <li class="flex items-center gap-2">
            <CheckCircle2 class="w-3.5 h-3.5 text-status-online shrink-0" />
            <span><strong class="text-foreground font-mono">QR Code</strong> — URLs, Wi-Fi, 2FA TOTP, vCard, Calendar, UPI, Text</span>
          </li>
          <li class="flex items-center gap-2">
            <CheckCircle2 class="w-3.5 h-3.5 text-status-online shrink-0" />
            <span><strong class="text-foreground font-mono">Data Matrix</strong> — Industrial electronics, aerospace, pharmaceuticals</span>
          </li>
          <li class="flex items-center gap-2">
            <CheckCircle2 class="w-3.5 h-3.5 text-status-online shrink-0" />
            <span><strong class="text-foreground font-mono">Aztec Code</strong> — Airline boarding passes, railway tickets</span>
          </li>
          <li class="flex items-center gap-2">
            <CheckCircle2 class="w-3.5 h-3.5 text-status-online shrink-0" />
            <span><strong class="text-foreground font-mono">PDF417</strong> — Driver's licenses, government IDs, postal barcodes</span>
          </li>
        </ul>
      </div>

      <div class="p-4 rounded-none bg-background border border-border space-y-2">
        <div class="font-semibold text-primary flex items-center gap-1.5 text-xs uppercase tracking-wider">
          <Barcode class="w-3.5 h-3.5" />
          <span>1D Linear Symbologies</span>
        </div>
        <ul class="space-y-1.5 text-muted-foreground">
          <li class="flex items-center gap-2">
            <CheckCircle2 class="w-3.5 h-3.5 text-status-online shrink-0" />
            <span><strong class="text-foreground font-mono">EAN-13 / EAN-8</strong> — International retail & supermarket products</span>
          </li>
          <li class="flex items-center gap-2">
            <CheckCircle2 class="w-3.5 h-3.5 text-status-online shrink-0" />
            <span><strong class="text-foreground font-mono">UPC-A / UPC-E</strong> — North American retail barcodes</span>
          </li>
          <li class="flex items-center gap-2">
            <CheckCircle2 class="w-3.5 h-3.5 text-status-online shrink-0" />
            <span><strong class="text-foreground font-mono">Code 128 / Code 39</strong> — Logistics, shipping, warehousing, assets</span>
          </li>
          <li class="flex items-center gap-2">
            <CheckCircle2 class="w-3.5 h-3.5 text-status-online shrink-0" />
            <span><strong class="text-foreground font-mono">ITF-14</strong> — Corrugated shipping cartons</span>
          </li>
          <li class="flex items-center gap-2">
            <CheckCircle2 class="w-3.5 h-3.5 text-status-online shrink-0" />
            <span><strong class="text-foreground font-mono">Codabar</strong> — Libraries, blood banks, FedEx airbills</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>
