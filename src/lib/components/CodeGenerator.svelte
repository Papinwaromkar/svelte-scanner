<script lang="ts">
  import QRCode from 'qrcode';
  import JsBarcode from 'jsbarcode';
  import {
    QrCode,
    Barcode,
    Download,
    Copy,
    Check,
    Wifi,
    FileText,
    ExternalLink,
    Phone,
    Mail,
    User,
    CreditCard,
    Calendar,
    Coins,
    Sparkles,
    AlertCircle
  } from '@lucide/svelte';

  interface Props {
    initialText?: string;
  }

  let { initialText = '' }: Props = $props();

  let activeType = $state<'qr' | 'barcode'>('qr');
  let qrSubtype = $state<'text' | 'url' | 'wifi' | 'contact' | 'calendar' | 'crypto' | 'email' | 'phone' | 'upi'>('text');

  // Input states
  let textInput = $state('https://svelte.dev');
  let urlInput = $state('https://svelte.dev');

  $effect(() => {
    if (initialText) {
      textInput = initialText;
    }
  });

  // Wi-Fi inputs
  let wifiSsid = $state('MyHomeNetwork');
  let wifiPassword = $state('SecretPass123');
  let wifiEncryption = $state<'WPA' | 'WEP' | 'nopass'>('WPA');
  let wifiHidden = $state(false);

  // Contact inputs
  let contactName = $state('John Doe');
  let contactPhone = $state('+1234567890');
  let contactEmail = $state('john@example.com');
  let contactOrg = $state('Company Inc');

  // Calendar event inputs
  let calTitle = $state('Product Launch Meeting');
  let calLocation = $state('Conference Room A');
  let calDate = $state(new Date().toISOString().slice(0, 10));

  // Crypto inputs
  let cryptoCurrency = $state<'BTC' | 'ETH' | 'SOL'>('BTC');
  let cryptoAddress = $state('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');

  // Email / Phone / UPI
  let emailTo = $state('hello@example.com');
  let emailSubject = $state('Inquiry');
  let phoneNum = $state('+1234567890');
  let upiVpa = $state('merchant@upi');
  let upiName = $state('Merchant');
  let upiAmount = $state('100');

  // QR Customizations
  let qrForeground = $state('#ff6c2e');
  let qrBackground = $state('#ffffff');
  let qrErrorCorrection = $state<'L' | 'M' | 'Q' | 'H'>('M');
  let qrSize = $state(320);

  // Barcode inputs
  let barcodeFormat = $state<'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF14'>('CODE128');
  let barcodeValue = $state('123456789012');
  let barcodeColor = $state('#ff6c2e');
  let barcodeBackground = $state('#ffffff');
  let barcodeShowText = $state(true);

  let qrCanvas: HTMLCanvasElement | null = $state(null);
  let barcodeSvg: SVGSVGElement | null = $state(null);

  let genError = $state<string | null>(null);
  let copied = $state(false);

  let qrPayload = $derived.by(() => {
    switch (qrSubtype) {
      case 'url':
        return urlInput.startsWith('http') ? urlInput : `https://${urlInput}`;
      case 'wifi':
        return `WIFI:S:${wifiSsid};T:${wifiEncryption};P:${wifiPassword};H:${wifiHidden};;`;
      case 'contact':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${contactName}\nTEL:${contactPhone}\nEMAIL:${contactEmail}\nORG:${contactOrg}\nEND:VCARD`;
      case 'calendar':
        return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${calTitle}\nLOCATION:${calLocation}\nDTSTART:${calDate.replace(/-/g, '')}T090000Z\nEND:VEVENT\nEND:VCALENDAR`;
      case 'crypto':
        return `${cryptoCurrency.toLowerCase()}:${cryptoAddress}`;
      case 'email':
        return `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}`;
      case 'phone':
        return `tel:${phoneNum}`;
      case 'upi':
        return `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(upiName)}&am=${upiAmount}&cu=INR`;
      case 'text':
      default:
        return textInput;
    }
  });

  $effect(() => {
    if (activeType === 'qr') {
      renderQRCode(qrPayload);
    } else {
      renderBarcode(barcodeValue);
    }
  });

  async function renderQRCode(text: string) {
    if (!qrCanvas) return;
    genError = null;
    try {
      await QRCode.toCanvas(qrCanvas, text || ' ', {
        width: qrSize,
        margin: 2,
        color: {
          dark: qrForeground,
          light: qrBackground
        },
        errorCorrectionLevel: qrErrorCorrection
      });
    } catch (err: any) {
      console.error(err);
      genError = 'Failed to generate QR code: Payload too large for selected error correction level.';
    }
  }

  function renderBarcode(text: string) {
    if (!barcodeSvg) return;
    genError = null;
    try {
      JsBarcode(barcodeSvg, text, {
        format: barcodeFormat,
        lineColor: barcodeColor,
        background: barcodeBackground,
        displayValue: barcodeShowText,
        fontSize: 13,
        margin: 10,
        height: 75
      });
    } catch (err: any) {
      console.error(err);
      genError = `Invalid value for ${barcodeFormat}: ${err.message || 'Check digits or character requirements.'}`;
    }
  }

  function downloadQR() {
    if (!qrCanvas) return;
    const url = qrCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qrcode_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function downloadBarcode() {
    if (!barcodeSvg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(barcodeSvg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcode_${barcodeFormat}_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyPayload() {
    const textToCopy = activeType === 'qr' ? qrPayload : barcodeValue;
    navigator.clipboard.writeText(textToCopy).then(() => {
      copied = true;
      setTimeout(() => (copied = false), 2000);
    });
  }
</script>

<div class="w-full max-w-4xl mx-auto space-y-6">
  <!-- Tabs -->
  <div class="flex p-1 bg-[#F3F4F6] border border-border rounded-none max-w-md mx-auto">
    <button
      onclick={() => (activeType = 'qr')}
      class="flex-1 py-2.5 px-4 rounded-none text-xs font-semibold flex items-center justify-center gap-2 transition-all {activeType === 'qr' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
    >
      <QrCode class="w-4 h-4" />
      <span>2D QR Code</span>
    </button>

    <button
      onclick={() => (activeType = 'barcode')}
      class="flex-1 py-2.5 px-4 rounded-none text-xs font-semibold flex items-center justify-center gap-2 transition-all {activeType === 'barcode' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
    >
      <Barcode class="w-4 h-4" />
      <span>1D Barcode</span>
    </button>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <!-- Form Inputs Section -->
    <div class="lg:col-span-7 bg-surface border border-border rounded-none p-6 shadow-xl space-y-5">
      {#if activeType === 'qr'}
        <div>
          <span class="block text-xs font-medium text-muted-foreground mb-2">QR Code Data Type</span>
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
            <button
              onclick={() => (qrSubtype = 'text')}
              class="p-2.5 rounded-none border flex flex-col items-center gap-1.5 transition-all {qrSubtype === 'text' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}"
            >
              <FileText class="w-4 h-4" />
              <span>Plain Text</span>
            </button>

            <button
              onclick={() => (qrSubtype = 'url')}
              class="p-2.5 rounded-none border flex flex-col items-center gap-1.5 transition-all {qrSubtype === 'url' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}"
            >
              <ExternalLink class="w-4 h-4" />
              <span>Website</span>
            </button>

            <button
              onclick={() => (qrSubtype = 'wifi')}
              class="p-2.5 rounded-none border flex flex-col items-center gap-1.5 transition-all {qrSubtype === 'wifi' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}"
            >
              <Wifi class="w-4 h-4" />
              <span>Wi-Fi</span>
            </button>

            <button
              onclick={() => (qrSubtype = 'contact')}
              class="p-2.5 rounded-none border flex flex-col items-center gap-1.5 transition-all {qrSubtype === 'contact' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}"
            >
              <User class="w-4 h-4" />
              <span>vCard</span>
            </button>

            <button
              onclick={() => (qrSubtype = 'calendar')}
              class="p-2.5 rounded-none border flex flex-col items-center gap-1.5 transition-all {qrSubtype === 'calendar' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}"
            >
              <Calendar class="w-4 h-4" />
              <span>Calendar</span>
            </button>

            <button
              onclick={() => (qrSubtype = 'crypto')}
              class="p-2.5 rounded-none border flex flex-col items-center gap-1.5 transition-all {qrSubtype === 'crypto' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}"
            >
              <Coins class="w-4 h-4" />
              <span>Crypto</span>
            </button>

            <button
              onclick={() => (qrSubtype = 'upi')}
              class="p-2.5 rounded-none border flex flex-col items-center gap-1.5 transition-all {qrSubtype === 'upi' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}"
            >
              <CreditCard class="w-4 h-4" />
              <span>UPI Pay</span>
            </button>

            <button
              onclick={() => (qrSubtype = 'email')}
              class="p-2.5 rounded-none border flex flex-col items-center gap-1.5 transition-all {qrSubtype === 'email' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'}"
            >
              <Mail class="w-4 h-4" />
              <span>Email</span>
            </button>
          </div>
        </div>

        <!-- Dynamic Inputs based on subtype -->
        {#if qrSubtype === 'text'}
          <div>
            <label for="qr-text" class="block text-xs font-medium text-muted-foreground mb-1">Text Content</label>
            <textarea
              id="qr-text"
              bind:value={textInput}
              rows={4}
              placeholder="Enter text to encode..."
              class="w-full bg-background border border-border rounded-none p-3 text-xs text-foreground focus:outline-none focus:border-primary/50"
            ></textarea>
          </div>
        {:else if qrSubtype === 'url'}
          <div>
            <label for="qr-url" class="block text-xs font-medium text-muted-foreground mb-1">Website URL</label>
            <input
              id="qr-url"
              type="url"
              bind:value={urlInput}
              placeholder="https://example.com"
              class="w-full bg-background border border-border rounded-none px-3 py-2.5 text-xs text-foreground focus:outline-none"
            />
          </div>
        {:else if qrSubtype === 'wifi'}
          <div class="space-y-3">
            <div>
              <label for="wifi-ssid" class="block text-xs font-medium text-muted-foreground mb-1">Network SSID</label>
              <input
                id="wifi-ssid"
                type="text"
                bind:value={wifiSsid}
                class="w-full bg-background border border-border rounded-none px-3 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label for="wifi-password" class="block text-xs font-medium text-muted-foreground mb-1">Password</label>
              <input
                id="wifi-password"
                type="text"
                bind:value={wifiPassword}
                class="w-full bg-background border border-border rounded-none px-3 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>
        {:else if qrSubtype === 'calendar'}
          <div class="space-y-3">
            <div>
              <label for="cal-title" class="block text-xs font-medium text-muted-foreground mb-1">Event Title</label>
              <input
                id="cal-title"
                type="text"
                bind:value={calTitle}
                class="w-full bg-background border border-border rounded-none px-3 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label for="cal-loc" class="block text-xs font-medium text-muted-foreground mb-1">Location</label>
              <input
                id="cal-loc"
                type="text"
                bind:value={calLocation}
                class="w-full bg-background border border-border rounded-none px-3 py-2 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>
        {:else if qrSubtype === 'crypto'}
          <div class="space-y-3">
            <div>
              <label for="crypto-curr" class="block text-xs font-medium text-muted-foreground mb-1">Crypto Asset</label>
              <select
                id="crypto-curr"
                bind:value={cryptoCurrency}
                class="w-full bg-background border border-border rounded-none px-3 py-2 text-xs text-foreground focus:outline-none"
              >
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="SOL">Solana (SOL)</option>
              </select>
            </div>
            <div>
              <label for="crypto-addr" class="block text-xs font-medium text-muted-foreground mb-1">Wallet Address</label>
              <input
                id="crypto-addr"
                type="text"
                bind:value={cryptoAddress}
                class="w-full bg-background border border-border rounded-none px-3 py-2 text-xs text-foreground font-mono focus:outline-none"
              />
            </div>
          </div>
        {/if}

        <!-- Color Customizer -->
        <div class="pt-3 border-t border-border grid grid-cols-2 gap-3 text-xs">
          <div>
            <label for="qr-foreground" class="block text-muted-foreground mb-1">Pattern Color</label>
            <div class="flex items-center gap-2">
              <input id="qr-foreground" type="color" bind:value={qrForeground} class="w-8 h-8 rounded border-0 bg-transparent cursor-pointer" />
              <span class="font-mono text-muted-foreground">{qrForeground}</span>
            </div>
          </div>
          <div>
            <label for="qr-background" class="block text-muted-foreground mb-1">Background</label>
            <div class="flex items-center gap-2">
              <input id="qr-background" type="color" bind:value={qrBackground} class="w-8 h-8 rounded border-0 bg-transparent cursor-pointer" />
              <span class="font-mono text-muted-foreground">{qrBackground}</span>
            </div>
          </div>
        </div>

      {:else}
        <!-- 1D Barcode Form -->
        <div class="space-y-4">
          <div>
            <label for="barcode-format" class="block text-xs font-medium text-muted-foreground mb-1">Symbology Standard</label>
            <select
              id="barcode-format"
              bind:value={barcodeFormat}
              class="w-full bg-background border border-border rounded-none px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
            >
              <option value="CODE128">Code 128 (Universal)</option>
              <option value="EAN13">EAN-13 (Retail - 13 Digits)</option>
              <option value="EAN8">EAN-8 (Retail - 8 Digits)</option>
              <option value="UPC">UPC-A (North America - 12 Digits)</option>
              <option value="CODE39">Code 39 (Alphanumeric)</option>
              <option value="ITF14">ITF-14 (Logistics)</option>
            </select>
          </div>

          <div>
            <label for="barcode-value" class="block text-xs font-medium text-muted-foreground mb-1">Barcode Value</label>
            <input
              id="barcode-value"
              type="text"
              bind:value={barcodeValue}
              class="w-full bg-background border border-border rounded-none px-3 py-2.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary/50"
            />
          </div>

          <div class="pt-3 border-t border-border grid grid-cols-2 gap-3 text-xs">
            <div>
              <label for="barcode-color" class="block text-muted-foreground mb-1">Bar Color</label>
              <div class="flex items-center gap-2">
                <input id="barcode-color" type="color" bind:value={barcodeColor} class="w-8 h-8 rounded border-0 bg-transparent cursor-pointer" />
                <span class="font-mono text-muted-foreground">{barcodeColor}</span>
              </div>
            </div>
            <div>
              <label for="barcode-background" class="block text-muted-foreground mb-1">Background</label>
              <div class="flex items-center gap-2">
                <input id="barcode-background" type="color" bind:value={barcodeBackground} class="w-8 h-8 rounded border-0 bg-transparent cursor-pointer" />
                <span class="font-mono text-muted-foreground">{barcodeBackground}</span>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Live Preview & Download Section -->
    <div class="lg:col-span-5 bg-surface border border-border rounded-none p-6 shadow-xl flex flex-col items-center justify-between gap-6">
      <div class="w-full text-center">
        <h4 class="text-xs uppercase font-semibold tracking-wider text-muted-foreground mb-4">Live Preview</h4>

        {#if genError}
          <div class="p-3 rounded-none bg-status-error-bg border border-status-error/30 text-status-error text-xs text-left mb-3 flex items-start gap-2">
            <AlertCircle class="w-4 h-4 shrink-0 text-status-error mt-0.5" />
            <span>{genError}</span>
          </div>
        {/if}

        <div class="p-4 rounded-none bg-background border border-border flex items-center justify-center min-h-[220px] shadow-inner overflow-hidden">
          {#if activeType === 'qr'}
            <canvas bind:this={qrCanvas} class="max-w-full rounded-lg"></canvas>
          {:else}
            <svg bind:this={barcodeSvg} class="max-w-full"></svg>
          {/if}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="w-full space-y-2">
        <button
          onclick={activeType === 'qr' ? downloadQR : downloadBarcode}
          class="w-full py-2.5 px-4 rounded-none bg-primary hover:bg-primary/90 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-lg "
        >
          <Download class="w-4 h-4" />
          <span>Download {activeType === 'qr' ? 'PNG Image' : 'SVG Vector'}</span>
        </button>

        <button
          onclick={copyPayload}
          class="w-full py-2 px-4 rounded-none bg-[#F3F4F6] hover:bg-[#E5E5E5] text-foreground font-medium text-xs flex items-center justify-center gap-2 border border-border transition-colors"
        >
          {#if copied}
            <Check class="w-3.5 h-3.5 text-status-online" />
            <span>Copied Payload!</span>
          {:else}
            <Copy class="w-3.5 h-3.5" />
            <span>Copy Raw Text</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>
