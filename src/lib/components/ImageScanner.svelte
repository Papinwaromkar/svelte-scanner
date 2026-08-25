<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Upload,
    Image as ImageIcon,
    Clipboard,
    AlertCircle,
    Sparkles,
    RefreshCw,
    RotateCw,
    Layers,
    CheckCircle2,
    ArrowRight
  } from '@lucide/svelte';
  import confetti from 'canvas-confetti';
  import { scannerEngine } from '../services/scanner';
  import { parseBarcodeContent } from '../services/parser';
  import { audioManager } from '../services/audio';
  import { historyService } from '../services/history';
  import type { ScanRecord, BarcodeFormatType } from '../types';

  interface Props {
    onScan: (record: ScanRecord) => void;
  }

  let { onScan }: Props = $props();

  let isDragging = $state(false);
  let isProcessing = $state(false);
  let scanError = $state<string | null>(null);
  let previewUrl = $state<string | null>(null);
  let fileInput: HTMLInputElement | null = $state(null);
  let currentFile: File | null = $state(null);
  let rotationAngle = $state(0);

  // Multi-code detection list
  let detectedRecords = $state<ScanRecord[]>([]);

  onMount(() => {
    window.addEventListener('paste', handleClipboardPaste);
  });

  onDestroy(() => {
    window.removeEventListener('paste', handleClipboardPaste);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  });

  async function handleClipboardPaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          await processFile(file);
          break;
        }
      }
    }
  }

  async function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }

  async function processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      scanError = 'Please upload a valid image file (PNG, JPG, WEBP, etc.)';
      return;
    }

    scanError = null;
    isProcessing = true;
    currentFile = file;
    detectedRecords = [];

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    previewUrl = URL.createObjectURL(file);

    try {
      const results = await scannerEngine.scanImageFile(file);

      if (results && results.length > 0) {
        audioManager.playSound('pos_beep');
        audioManager.vibratePattern('standard');

        confetti({
          particleCount: 45,
          spread: 70,
          origin: { y: 0.7 }
        });

        const records: ScanRecord[] = [];
        for (const res of results) {
          const parsed = parseBarcodeContent(res.text, res.format);
          const rec = historyService.addOrIncrement({
            rawText: res.text,
            format: res.format,
            parsed
          });
          records.push(rec);
        }

        detectedRecords = records;

        // If only 1 result found, trigger modal directly
        if (records.length === 1) {
          onScan(records[0]);
        }
      } else {
        scanError = 'No barcode or QR code detected. Try rotating the image or adjusting lighting.';
      }
    } catch (err: any) {
      console.error(err);
      scanError = 'Failed to process image. Please try another file.';
    } finally {
      isProcessing = false;
    }
  }

  async function rotateAndRescan() {
    if (!currentFile) return;
    rotationAngle = (rotationAngle + 90) % 360;

    const img = new Image();
    const url = URL.createObjectURL(currentFile);

    img.onload = async () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      if (rotationAngle % 180 !== 0) {
        canvas.width = img.naturalHeight;
        canvas.height = img.naturalWidth;
      } else {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotationAngle * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      canvas.toBlob(async (blob) => {
        if (blob) {
          const rotatedFile = new File([blob], 'rotated.png', { type: 'image/png' });
          await processFile(rotatedFile);
        }
      });
    };

    img.src = url;
  }

  function resetImage() {
    previewUrl = null;
    currentFile = null;
    scanError = null;
    detectedRecords = [];
    rotationAngle = 0;
    if (fileInput) {
      fileInput.value = '';
    }
  }
</script>

<div class="w-full max-w-3xl mx-auto space-y-5">
  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    onchange={handleFileChange}
    class="hidden"
  />

  <!-- Drop Zone Area -->
  <div
    role="button"
    tabindex="0"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    onclick={() => fileInput?.click()}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        fileInput?.click();
      }
    }}
    class="relative rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer bg-gray-950/60 backdrop-blur-md flex flex-col items-center justify-center min-h-[300px] {isDragging
      ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]'
      : 'border-gray-800 hover:border-gray-700 hover:bg-gray-900/40'}"
  >
    {#if isProcessing}
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm font-medium text-gray-300">Scanning image for barcodes & QR codes...</p>
      </div>
    {:else if previewUrl}
      <div class="flex flex-col items-center gap-4 w-full">
        <div class="relative max-h-60 max-w-full rounded-2xl overflow-hidden border border-gray-800 shadow-xl bg-black">
          <img src={previewUrl} alt="Uploaded" class="max-h-60 object-contain mx-auto" />
        </div>

        <div class="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onclick={(e) => {
              e.stopPropagation();
              rotateAndRescan();
            }}
            class="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium border border-gray-700 transition-colors flex items-center gap-1.5"
          >
            <RotateCw class="w-3.5 h-3.5 text-cyan-400" />
            <span>Rotate 90° & Rescan</span>
          </button>

          <button
            type="button"
            onclick={(e) => {
              e.stopPropagation();
              resetImage();
            }}
            class="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium border border-gray-700 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw class="w-3.5 h-3.5" />
            <span>Upload Another</span>
          </button>
        </div>
      </div>
    {:else}
      <div class="p-4 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-4 shadow-lg shadow-cyan-500/5">
        <Upload class="w-8 h-8" />
      </div>
      <h3 class="text-base sm:text-lg font-bold text-white mb-1.5">Drop Image Here or Click to Browse</h3>
      <p class="text-xs text-gray-400 max-w-sm mb-4 leading-relaxed">
        Supports PNG, JPG, WEBP, GIF, SVG. You can also paste screenshots directly from your clipboard (<span class="font-mono text-cyan-300">Ctrl + V</span>).
      </p>

      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-xs text-gray-300">
        <Clipboard class="w-3.5 h-3.5 text-cyan-400" />
        <span>Clipboard Paste Supported Anywhere</span>
      </div>
    {/if}
  </div>

  <!-- Multi-Code Results List (if multiple found in 1 image) -->
  {#if detectedRecords.length > 1}
    <div class="p-5 rounded-3xl bg-gray-900 border border-gray-800 space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-bold text-white flex items-center gap-2">
          <Layers class="w-4 h-4 text-cyan-400" />
          <span>Found {detectedRecords.length} Barcodes in Image</span>
        </h4>
        <span class="text-xs text-gray-400">Click any code to inspect</span>
      </div>

      <div class="space-y-2">
        {#each detectedRecords as rec, i}
          <button
            onclick={() => onScan(rec)}
            class="w-full p-3.5 rounded-2xl bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 flex items-center justify-between gap-3 text-left transition-colors"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold text-xs text-white">{rec.parsed.title}</span>
                <span class="font-mono text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-cyan-300 border border-gray-700">
                  {rec.format}
                </span>
              </div>
              <div class="font-mono text-xs text-gray-400 truncate">{rec.rawText}</div>
            </div>
            <ArrowRight class="w-4 h-4 text-gray-500 shrink-0" />
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Error Feedback -->
  {#if scanError}
    <div class="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start gap-3 animate-fade-in">
      <AlertCircle class="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      <div class="leading-relaxed">
        <span class="font-bold block text-red-300 mb-0.5">Scan Unsuccessful</span>
        {scanError}
      </div>
    </div>
  {/if}
</div>
