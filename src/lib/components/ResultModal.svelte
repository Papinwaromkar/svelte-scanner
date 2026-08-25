<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { ScanRecord } from '../types';
  import {
    Copy,
    Check,
    ExternalLink,
    Wifi,
    Phone,
    Mail,
    MessageSquare,
    MapPin,
    ShoppingBag,
    Download,
    X,
    QrCode,
    Sparkles,
    Eye,
    EyeOff,
    FileText,
    CreditCard,
    ShieldCheck,
    ShieldAlert,
    KeyRound,
    Calendar,
    Coins,
    BookOpen,
    Edit3,
    Clock
  } from '@lucide/svelte';
  import { generateTOTP } from '../services/totp';
  import { historyService } from '../services/history';

  interface Props {
    record: ScanRecord | null;
    onClose: () => void;
    onGenerate?: (text: string) => void;
  }

  let { record, onClose, onGenerate }: Props = $props();

  let copied = $state(false);
  let passwordCopied = $state(false);
  let showPassword = $state(false);
  let totpCode = $state('------');
  let totpSecondsLeft = $state(30);
  let totpCopied = $state(false);
  let totpTimer: any = null;

  // Notes editing state
  let isEditingNotes = $state(false);
  let itemNotes = $state('');

  $effect(() => {
    if (record) {
      itemNotes = record.notes || '';
      if (record.parsed.category === 'totp' && record.parsed.totp?.secret) {
        startTotpUpdater(record.parsed.totp.secret, record.parsed.totp.period || 30, record.parsed.totp.digits || 6);
      }
    }
  });

  onDestroy(() => {
    if (totpTimer) clearInterval(totpTimer);
  });

  function startTotpUpdater(secret: string, period = 30, digits = 6) {
    if (totpTimer) clearInterval(totpTimer);

    const update = async () => {
      const res = await generateTOTP(secret, period, digits);
      totpCode = res.code;
      totpSecondsLeft = res.secondsRemaining;
    };

    update();
    totpTimer = setInterval(update, 1000);
  }

  function copyToClipboard(text: string, type: 'general' | 'password' | 'totp' = 'general') {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'password') {
        passwordCopied = true;
        setTimeout(() => (passwordCopied = false), 2000);
      } else if (type === 'totp') {
        totpCopied = true;
        setTimeout(() => (totpCopied = false), 2000);
      } else {
        copied = true;
        setTimeout(() => (copied = false), 2000);
      }
    });
  }

  function saveNotes() {
    if (!record) return;
    record.notes = itemNotes;
    historyService.updateNotes(record.id, itemNotes);
    isEditingNotes = false;
  }

  function downloadVCard(vcardStr: string, name: string) {
    const blob = new Blob([vcardStr], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name || 'contact').replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadIcs(icsStr: string, title: string) {
    const blob = new Blob([icsStr], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'event').replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

{#if record}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
    <div class="relative w-full max-w-lg bg-surface border border-border rounded-none shadow-2xl overflow-hidden text-foreground flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-none bg-primary/10 text-primary border border-primary/20">
            {#if record.parsed.category === 'wifi'}
              <Wifi class="w-5 h-5" />
            {:else if record.parsed.category === 'totp'}
              <KeyRound class="w-5 h-5 text-status-online" />
            {:else if record.parsed.category === 'calendar'}
              <Calendar class="w-5 h-5 text-amber-400" />
            {:else if record.parsed.category === 'crypto'}
              <Coins class="w-5 h-5 text-amber-400" />
            {:else if record.parsed.category === 'isbn'}
              <BookOpen class="w-5 h-5 text-primary" />
            {:else if record.parsed.category === 'url'}
              <ExternalLink class="w-5 h-5" />
            {:else if record.parsed.category === 'phone'}
              <Phone class="w-5 h-5" />
            {:else if record.parsed.category === 'email'}
              <Mail class="w-5 h-5" />
            {:else if record.parsed.category === 'sms'}
              <MessageSquare class="w-5 h-5" />
            {:else if record.parsed.category === 'geo'}
              <MapPin class="w-5 h-5" />
            {:else if record.parsed.category === 'product'}
              <ShoppingBag class="w-5 h-5" />
            {:else if record.parsed.category === 'upi' || record.parsed.category === 'epc_payment'}
              <CreditCard class="w-5 h-5" />
            {:else}
              <FileText class="w-5 h-5" />
            {/if}
          </div>
          <div>
            <h3 class="font-bold text-base leading-tight text-foreground">{record.parsed.title}</h3>
            <div class="flex items-center gap-2 mt-1">
              <span class="inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#F3F4F6] text-primary border border-border">
                {record.format.replace('_', '-')}
              </span>
              {#if record.parsed.checksum?.hasChecksum}
                <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded {record.parsed.checksum.isValid ? 'bg-status-online-badge text-status-online border border-status-online/30' : 'bg-status-error-badge text-status-error border border-status-error/30'}">
                  {#if record.parsed.checksum.isValid}
                    <ShieldCheck class="w-3 h-3" />
                    <span>Checksum Valid</span>
                  {:else}
                    <ShieldAlert class="w-3 h-3" />
                    <span>Checksum Invalid</span>
                  {/if}
                </span>
              {/if}
            </div>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-2 rounded-none text-muted-foreground hover:text-foreground hover:bg-[#F3F4F6] transition-colors"
          aria-label="Close modal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content Body -->
      <div class="p-6 overflow-y-auto space-y-5">
        <!-- 1. 2FA / TOTP Authenticator Card -->
        {#if record.parsed.category === 'totp' && record.parsed.totp}
          <div class="p-5 rounded-none bg-status-online-bg border border-status-online/30 text-center space-y-4">
            <div class="text-xs uppercase tracking-wider font-semibold text-status-online">
              Live Two-Factor Authentication Code
            </div>

            <!-- OTP Display & Timer -->
            <div class="flex items-center justify-center gap-4">
              <div class="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-foreground bg-background px-5 py-3 rounded-none border border-status-online/40 shadow-inner">
                {totpCode}
              </div>

              <!-- 30s Countdown Ring -->
              <div class="flex flex-col items-center justify-center w-12 h-12 rounded-none border-2 border-status-online/40 bg-background text-status-online font-mono text-xs font-bold shadow">
                <span>{totpSecondsLeft}s</span>
              </div>
            </div>

            <div class="flex items-center justify-center gap-2">
              <button
                onclick={() => copyToClipboard(totpCode, 'totp')}
                class="py-2 px-4 rounded-none bg-status-online hover:bg-status-online/90 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-lg "
              >
                {#if totpCopied}
                  <Check class="w-3.5 h-3.5" />
                  <span>Copied OTP!</span>
                {:else}
                  <Copy class="w-3.5 h-3.5" />
                  <span>Copy 6-Digit Code</span>
                {/if}
              </button>
            </div>
          </div>

        <!-- 2. Wi-Fi Card -->
        {:else if record.parsed.category === 'wifi' && record.parsed.wifi}
          <div class="p-4 rounded-none bg-[#F3F4F6] border border-border space-y-3">
            <div class="flex justify-between items-center text-xs">
              <span class="text-muted-foreground">Network Name (SSID):</span>
              <span class="font-semibold text-foreground font-mono">{record.parsed.wifi.ssid}</span>
            </div>
            <div class="flex justify-between items-center text-xs">
              <span class="text-muted-foreground">Security Encryption:</span>
              <span class="px-2 py-0.5 rounded bg-[#E5E5E5] text-[11px] font-semibold text-primary">
                {record.parsed.wifi.encryption || 'None (Open)'}
              </span>
            </div>
            {#if record.parsed.wifi.password}
              <div class="pt-2 border-t border-border flex items-center justify-between gap-2">
                <div class="text-xs">
                  <span class="text-muted-foreground block text-[10px]">Password:</span>
                  <span class="font-mono font-bold text-status-online">
                    {showPassword ? record.parsed.wifi.password : '••••••••••••'}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    onclick={() => (showPassword = !showPassword)}
                    class="p-2 rounded-lg border border-border bg-background hover:bg-foreground/5 text-muted-foreground transition-colors"
                  >
                    {#if showPassword}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                  <button
                    onclick={() => copyToClipboard(record?.parsed?.wifi?.password || '', 'password')}
                    class="px-3 py-1.5 rounded-lg bg-status-online hover:bg-status-online/90 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow"
                  >
                    {#if passwordCopied}
                      <Check class="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    {:else}
                      <Copy class="w-3.5 h-3.5" />
                      <span>Copy Password</span>
                    {/if}
                  </button>
                </div>
              </div>
            {/if}
          </div>

        <!-- 3. Calendar Event Card -->
        {:else if record.parsed.category === 'calendar' && record.parsed.calendar}
          <div class="p-4 rounded-none bg-[#F3F4F6] border border-border space-y-2.5 text-xs">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Event:</span>
              <span class="font-bold text-foreground">{record.parsed.calendar.title}</span>
            </div>
            {#if record.parsed.calendar.startTime}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Starts:</span>
                <span class="text-primary font-mono">{record.parsed.calendar.startTime.toLocaleString()}</span>
              </div>
            {/if}
            {#if record.parsed.calendar.location}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Location:</span>
                <span class="text-foreground">{record.parsed.calendar.location}</span>
              </div>
            {/if}
            <div class="pt-2 flex gap-2">
              <button
                onclick={() => downloadIcs(record?.parsed?.calendar?.rawIcs || record?.rawText || '', record?.parsed?.calendar?.title || 'event')}
                class="w-full py-2 px-3 rounded-none bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow"
              >
                <Download class="w-4 h-4" />
                <span>Save Event (.ics)</span>
              </button>
            </div>
          </div>

        <!-- 4. Crypto Address Card -->
        {:else if record.parsed.category === 'crypto' && record.parsed.crypto}
          <div class="p-4 rounded-none bg-[#F3F4F6] border border-border space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Cryptocurrency:</span>
              <span class="px-2 py-0.5 rounded bg-[#FFF4ED] text-primary font-bold border border-primary/30">
                {record.parsed.crypto.currency}
              </span>
            </div>
            <div>
              <div class="text-[10px] text-muted-foreground mb-1">Wallet Address:</div>
              <div class="p-2.5 rounded-none bg-background font-mono text-xs text-amber-300 break-all select-all border border-border">
                {record.parsed.crypto.address}
              </div>
            </div>
            <div class="flex gap-2">
              <a
                href={record.parsed.crypto.explorerUrl}
                target="_blank"
                rel="noreferrer"
                class="flex-1 py-2 px-3 rounded-none border border-border bg-background hover:bg-foreground/5 text-foreground font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink class="w-3.5 h-3.5 text-amber-400" />
                <span>View on Explorer</span>
              </a>
            </div>
          </div>

        <!-- 5. Product / ISBN Barcode Card -->
        {:else if record.parsed.category === 'product' || record.parsed.category === 'isbn'}
          <div class="p-4 rounded-none bg-[#F3F4F6] border border-border space-y-3">
            <div class="text-center py-1">
              <div class="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                {record.parsed.category === 'isbn' ? 'Book ISBN Number' : 'Product Barcode Number'}
              </div>
              <div class="text-2xl font-mono font-bold tracking-widest text-primary mt-0.5">{record.rawText}</div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(record.rawText)}`}
                target="_blank"
                rel="noreferrer"
                class="p-2.5 rounded-none border border-border bg-background hover:bg-foreground/5 text-center text-foreground font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink class="w-3.5 h-3.5 text-primary" />
                <span>Google</span>
              </a>
              <a
                href={`https://www.amazon.com/s?k=${encodeURIComponent(record.rawText)}`}
                target="_blank"
                rel="noreferrer"
                class="p-2.5 rounded-none border border-border bg-background hover:bg-foreground/5 text-center text-foreground font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <ShoppingBag class="w-3.5 h-3.5 text-amber-400" />
                <span>Amazon</span>
              </a>
              {#if record.parsed.category === 'isbn'}
                <a
                  href={`https://openlibrary.org/isbn/${encodeURIComponent(record.rawText)}`}
                  target="_blank"
                  rel="noreferrer"
                  class="p-2.5 rounded-none border border-border bg-background hover:bg-foreground/5 text-center text-foreground font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <BookOpen class="w-3.5 h-3.5 text-primary" />
                  <span>Open Library</span>
                </a>
              {:else}
                <a
                  href={`https://world.openfoodfacts.org/product/${encodeURIComponent(record.rawText)}`}
                  target="_blank"
                  rel="noreferrer"
                  class="p-2.5 rounded-none border border-border bg-background hover:bg-foreground/5 text-center text-foreground font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sparkles class="w-3.5 h-3.5 text-status-online" />
                  <span>Open Food Facts</span>
                </a>
              {/if}
              <a
                href={`https://www.upcitemdb.com/query?s=${encodeURIComponent(record.rawText)}&type=2`}
                target="_blank"
                rel="noreferrer"
                class="p-2.5 rounded-none border border-border bg-background hover:bg-foreground/5 text-center text-foreground font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <FileText class="w-3.5 h-3.5 text-primary" />
                <span>UPCitemdb</span>
              </a>
            </div>
          </div>

        <!-- 6. vCard Contact Card -->
        {:else if record.parsed.category === 'vcard' && record.parsed.vcard}
          <div class="p-4 rounded-none bg-[#F3F4F6] border border-border space-y-2 text-xs">
            {#if record.parsed.vcard.fullName}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Name:</span>
                <span class="font-bold text-foreground">{record.parsed.vcard.fullName}</span>
              </div>
            {/if}
            {#if record.parsed.vcard.organization}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Company:</span>
                <span class="text-foreground">{record.parsed.vcard.organization}</span>
              </div>
            {/if}
            {#if record.parsed.vcard.phone}
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Phone:</span>
                <a href={`tel:${record.parsed.vcard.phone}`} class="text-primary hover:underline font-mono">
                  {record.parsed.vcard.phone}
                </a>
              </div>
            {/if}
            {#if record.parsed.vcard.email}
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Email:</span>
                <a href={`mailto:${record.parsed.vcard.email}`} class="text-primary hover:underline">
                  {record.parsed.vcard.email}
                </a>
              </div>
            {/if}
            <div class="pt-2">
              <button
                onclick={() => downloadVCard(record?.rawText || '', record?.parsed?.vcard?.fullName || 'contact')}
                class="w-full py-2 px-3 rounded-none bg-primary hover:bg-primary/90 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow"
              >
                <Download class="w-4 h-4" />
                <span>Save Contact (.vcf)</span>
              </button>
            </div>
          </div>
        {/if}

        <!-- Custom Notes Section -->
        <div class="p-3.5 rounded-none bg-background border border-border space-y-2">
          <div class="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span class="flex items-center gap-1.5">
              <Edit3 class="w-3.5 h-3.5 text-primary" />
              <span>Notes & Tagging</span>
            </span>
            {#if !isEditingNotes}
              <button
                onclick={() => (isEditingNotes = true)}
                class="text-primary hover:underline text-[11px]"
              >
                {record.notes ? 'Edit' : '+ Add Note'}
              </button>
            {/if}
          </div>

          {#if isEditingNotes}
            <div class="space-y-2">
              <textarea
                bind:value={itemNotes}
                rows={2}
                placeholder="Add custom notes, serial tags, or product details..."
                class="w-full bg-surface border border-border rounded-none p-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50 resize-none"
              ></textarea>
              <div class="flex justify-end gap-2 text-xs">
                <button
                  onclick={() => (isEditingNotes = false)}
                  class="px-2.5 py-1 rounded-lg bg-[#F3F4F6] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onclick={saveNotes}
                  class="px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium shadow"
                >
                  Save Note
                </button>
              </div>
            </div>
          {:else if record.notes}
            <p class="text-xs text-muted-foreground italic">{record.notes}</p>
          {/if}
        </div>

        <!-- Raw Text Box -->
        <div>
          <div class="flex justify-between items-center mb-1.5 text-xs text-muted-foreground font-medium">
            <span>Decoded Raw Payload:</span>
            <span>{record.rawText.length} chars</span>
          </div>
          <div class="relative group">
            <textarea
              readonly
              value={record.rawText}
              rows={Math.min(5, Math.max(2, record.rawText.split('\n').length))}
              class="w-full p-3 rounded-none bg-background border border-border text-muted-foreground font-mono text-xs focus:outline-none focus:border-primary/50 resize-none select-all"
            ></textarea>
          </div>
        </div>

        <!-- Scanned Metadata -->
        <div class="flex items-center justify-between text-[11px] text-muted border-t border-border pt-3">
          <span>Scanned: {new Date(record.timestamp).toLocaleTimeString()}</span>
          <span>Date: {new Date(record.timestamp).toLocaleDateString()}</span>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="p-4 border-t border-border bg-surface flex flex-wrap gap-2 justify-end">
        {#if record.parsed.url}
          <a
            href={record.parsed.url}
            target="_blank"
            rel="noreferrer"
            class="px-4 py-2 rounded-none bg-primary hover:bg-primary/90 text-white font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors shadow"
          >
            <ExternalLink class="w-4 h-4" />
            <span>Open Link</span>
          </a>
        {/if}

        {#if onGenerate}
          <button
            onclick={() => {
              if (record) {
                onGenerate(record.rawText);
                onClose();
              }
            }}
            class="px-4 py-2 rounded-none bg-[#F3F4F6] hover:bg-[#E5E5E5] text-foreground font-medium text-xs sm:text-sm flex items-center gap-2 border border-border transition-colors"
          >
            <QrCode class="w-4 h-4 text-primary" />
            <span>Re-Generate Code</span>
          </button>
        {/if}

        <button
          onclick={() => copyToClipboard(record?.rawText || '')}
          class="px-4 py-2 rounded-none bg-[#F3F4F6] hover:bg-[#E5E5E5] text-foreground font-medium text-xs sm:text-sm flex items-center gap-2 border border-border transition-colors"
        >
          {#if copied}
            <Check class="w-4 h-4 text-status-online" />
            <span>Copied!</span>
          {:else}
            <Copy class="w-4 h-4 text-muted-foreground" />
            <span>Copy Text</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
