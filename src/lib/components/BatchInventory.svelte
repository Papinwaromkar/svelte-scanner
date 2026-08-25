<script lang="ts">
  import {
    Boxes,
    FileSpreadsheet,
    FileCode,
    FileText,
    Copy,
    Check,
    Trash2,
    Plus,
    Download,
    Printer,
    Upload,
    Hash,
    Layers,
    Search,
    Edit3
  } from '@lucide/svelte';
  import CameraScanner from './CameraScanner.svelte';
  import { historyService } from '../services/history';
  import type { ScanRecord } from '../types';

  let batchItems = $state<ScanRecord[]>([]);
  let searchQuery = $state('');
  let copied = $state(false);
  let importFileInput: HTMLInputElement | null = $state(null);

  let totalItemsCount = $derived(batchItems.reduce((sum, item) => sum + (item.count || 1), 0));
  let uniqueItemsCount = $derived(batchItems.length);

  let filteredBatch = $derived.by(() => {
    if (!searchQuery) return batchItems;
    const q = searchQuery.toLowerCase();
    return batchItems.filter(
      (b) =>
        b.rawText.toLowerCase().includes(q) ||
        b.parsed.title.toLowerCase().includes(q) ||
        (b.notes && b.notes.toLowerCase().includes(q)) ||
        b.format.toLowerCase().includes(q)
    );
  });

  function handleBatchScan(record: ScanRecord) {
    const existingIndex = batchItems.findIndex((b) => b.rawText === record.rawText && b.format === record.format);

    if (existingIndex >= 0) {
      batchItems[existingIndex].count = (batchItems[existingIndex].count || 1) + 1;
      batchItems[existingIndex].timestamp = Date.now();
      const item = batchItems.splice(existingIndex, 1)[0];
      batchItems = [item, ...batchItems];
    } else {
      batchItems = [{ ...record, count: 1 }, ...batchItems];
    }
  }

  function incrementCount(index: number) {
    batchItems[index].count = (batchItems[index].count || 1) + 1;
  }

  function decrementCount(index: number) {
    if ((batchItems[index].count || 1) > 1) {
      batchItems[index].count = (batchItems[index].count || 1) - 1;
    } else {
      batchItems.splice(index, 1);
    }
  }

  function removeItem(index: number) {
    batchItems.splice(index, 1);
  }

  function clearBatch() {
    if (confirm('Clear the current batch list?')) {
      batchItems = [];
    }
  }

  function exportCSV() {
    const csv = historyService.exportToCSV(batchItems);
    historyService.downloadFile(csv, `inventory_batch_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  function exportExcel() {
    const tsv = historyService.exportToExcelTSV(batchItems);
    historyService.downloadFile(tsv, `inventory_batch_${Date.now()}.tsv`, 'text/tab-separated-values;charset=utf-8;');
  }

  function exportJSON() {
    const json = historyService.exportToJSON(batchItems);
    historyService.downloadFile(json, `inventory_batch_${Date.now()}.json`, 'application/json');
  }

  function printLabels() {
    historyService.printLabelSheet(batchItems);
  }

  function copyBatchToClipboard() {
    const txt = batchItems
      .map((item, i) => `${i + 1}. [${item.format}] ${item.rawText} (Qty: ${item.count || 1})${item.notes ? ` - Note: ${item.notes}` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(txt).then(() => {
      copied = true;
      setTimeout(() => (copied = false), 2000);
    });
  }

  async function handleImportFile(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const text = await file.text();

    try {
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          batchItems = [...parsed, ...batchItems];
        }
      }
    } catch {
      alert('Failed to parse file. Please provide a valid JSON inventory file.');
    }
  }
</script>

<div class="w-full max-w-5xl mx-auto space-y-6">
  <input
    bind:this={importFileInput}
    type="file"
    accept=".json,.csv"
    onchange={handleImportFile}
    class="hidden"
  />

  <!-- Top Stat Cards -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <div class="p-4 rounded-none bg-surface border border-border flex items-center gap-3 shadow-sm">
      <div class="p-2.5 rounded-none bg-primary/10 text-primary border border-primary/20">
        <Hash class="w-5 h-5" />
      </div>
      <div>
        <div class="text-[11px] text-muted-foreground font-medium">Total Scanned</div>
        <div class="text-xl font-bold font-mono text-foreground">{totalItemsCount}</div>
      </div>
    </div>

    <div class="p-4 rounded-none bg-surface border border-border flex items-center gap-3 shadow-sm">
      <div class="p-2.5 rounded-none bg-status-online-bg text-status-online border border-status-online/20">
        <Layers class="w-5 h-5" />
      </div>
      <div>
        <div class="text-[11px] text-muted-foreground font-medium">Unique Items</div>
        <div class="text-xl font-bold font-mono text-foreground">{uniqueItemsCount}</div>
      </div>
    </div>

    <div class="p-4 rounded-none bg-surface border border-border flex items-center gap-3 shadow-sm">
      <div class="p-2.5 rounded-none bg-primary/10 text-primary border border-primary/20">
        <Boxes class="w-5 h-5" />
      </div>
      <div>
        <div class="text-[11px] text-muted-foreground font-medium">Inventory Mode</div>
        <div class="text-xs font-bold text-primary">Continuous 60FPS</div>
      </div>
    </div>

    <div class="p-4 rounded-none bg-surface border border-border flex items-center justify-between shadow-sm">
      <button
        onclick={printLabels}
        disabled={batchItems.length === 0}
        class="w-full py-2 px-3 rounded-none bg-[#F3F4F6] hover:bg-[#E5E5E5] disabled:opacity-40 text-foreground text-xs font-semibold flex items-center justify-center gap-2 border border-border transition-colors shadow"
      >
        <Printer class="w-4 h-4 text-primary" />
        <span>Print Labels</span>
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <!-- Camera Viewport Section -->
    <div class="lg:col-span-6">
      <CameraScanner onScan={handleBatchScan} continuousMode={true} />
    </div>

    <!-- Batch Table & Export Section -->
    <div class="lg:col-span-6 flex flex-col bg-surface border border-border rounded-none p-5 shadow-xl">
      <!-- Search & Header Bar -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-border mb-3">
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <h3 class="font-bold text-foreground text-sm">Batch Inventory</h3>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-none bg-primary/10 text-primary border border-primary/30">
            {batchItems.length} items
          </span>
        </div>

        {#if batchItems.length > 0}
          <div class="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            <button
              onclick={copyBatchToClipboard}
              class="p-2 rounded-none bg-[#F3F4F6] hover:bg-[#E5E5E5] text-muted-foreground border border-border text-xs transition-colors"
              title="Copy list to clipboard"
            >
              {#if copied}
                <Check class="w-3.5 h-3.5 text-status-online" />
              {:else}
                <Copy class="w-3.5 h-3.5" />
              {/if}
            </button>

            <button
              onclick={clearBatch}
              class="p-2 rounded-none bg-status-error-bg hover:bg-status-error-badge text-status-error border border-status-error/30 text-xs transition-colors"
              title="Clear current batch"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        {/if}
      </div>

      <!-- Item List / Empty State -->
      <div class="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1">
        {#if batchItems.length === 0}
          <div class="h-64 flex flex-col items-center justify-center text-center p-6 text-muted">
            <Boxes class="w-10 h-10 mb-2 stroke-[1.5] text-muted" />
            <p class="text-sm font-medium text-muted-foreground">Ready for continuous scanning</p>
            <p class="text-xs text-muted max-w-xs mt-1">
              Point camera at barcodes. The app continuously tracks items, increments quantities, and eliminates duplicate delays.
            </p>
          </div>
        {:else}
          {#each filteredBatch as item, index (item.rawText + item.format)}
            <div class="p-3 rounded-none bg-background border border-border flex items-center justify-between gap-3 text-xs">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#F3F4F6] text-primary border border-border">
                    {item.format}
                  </span>
                  <span class="text-muted text-[10px]">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="font-mono font-medium text-foreground truncate">{item.rawText}</div>
                {#if item.notes}
                  <div class="text-[11px] text-muted-foreground italic truncate mt-0.5">Note: {item.notes}</div>
                {/if}
              </div>

              <!-- Quantity Controls -->
              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  onclick={() => decrementCount(index)}
                  class="w-6 h-6 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E5E5] text-muted-foreground flex items-center justify-center font-bold font-mono transition-colors"
                >
                  -
                </button>
                <span class="w-6 text-center font-mono font-bold text-foreground text-sm">
                  {item.count || 1}
                </span>
                <button
                  onclick={() => incrementCount(index)}
                  class="w-6 h-6 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E5E5] text-muted-foreground flex items-center justify-center font-bold font-mono transition-colors"
                >
                  +
                </button>
                <button
                  onclick={() => removeItem(index)}
                  class="p-1.5 rounded-lg text-muted hover:text-status-error hover:bg-[#F3F4F6] transition-colors ml-1"
                  title="Remove"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Export Buttons Footer -->
      {#if batchItems.length > 0}
        <div class="pt-4 border-t border-border mt-3 grid grid-cols-3 gap-2 text-xs">
          <button
            onclick={exportCSV}
            class="py-2 px-2.5 rounded-none bg-status-online hover:bg-status-online/90 text-white font-medium flex items-center justify-center gap-1.5 transition-colors shadow"
          >
            <FileSpreadsheet class="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onclick={exportExcel}
            class="py-2 px-2.5 rounded-none bg-[#F3F4F6] hover:bg-[#E5E5E5] text-foreground font-medium flex items-center justify-center gap-1.5 border border-border transition-colors"
          >
            <FileSpreadsheet class="w-3.5 h-3.5 text-status-online" />
            <span>Excel</span>
          </button>
          <button
            onclick={exportJSON}
            class="py-2 px-2.5 rounded-none bg-[#F3F4F6] hover:bg-[#E5E5E5] text-foreground font-medium flex items-center justify-center gap-1.5 border border-border transition-colors"
          >
            <FileCode class="w-3.5 h-3.5 text-primary" />
            <span>JSON</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
