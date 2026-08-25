<script lang="ts">
  import { onMount } from 'svelte';
  import {
    History,
    Search,
    Trash2,
    FileSpreadsheet,
    FileCode,
    FileText,
    Printer,
    Upload,
    Star,
    ExternalLink,
    Wifi,
    ShoppingBag,
    Phone,
    Mail,
    Copy,
    Check,
    Filter,
    KeyRound,
    Calendar,
    Coins,
    BookOpen
  } from '@lucide/svelte';
  import { historyService } from '../services/history';
  import type { ScanRecord } from '../types';

  interface Props {
    onSelectRecord: (record: ScanRecord) => void;
  }

  let { onSelectRecord }: Props = $props();

  let records = $state<ScanRecord[]>([]);
  let searchQuery = $state('');
  let selectedCategory = $state<string>('ALL');
  let showFavoritesOnly = $state(false);
  let copiedId = $state<string | null>(null);
  let importInput: HTMLInputElement | null = $state(null);

  onMount(() => {
    loadRecords();
  });

  function loadRecords() {
    records = historyService.getAll();
  }

  let filteredRecords = $derived.by(() => {
    return records.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.rawText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.parsed.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.format.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory = selectedCategory === 'ALL' || r.parsed.category === selectedCategory;
      const matchFav = !showFavoritesOnly || r.favorite;

      return matchSearch && matchCategory && matchFav;
    });
  });

  function handleDelete(id: string, e: Event) {
    e.stopPropagation();
    historyService.remove(id);
    loadRecords();
  }

  function handleToggleFavorite(id: string, e: Event) {
    e.stopPropagation();
    historyService.toggleFavorite(id);
    loadRecords();
  }

  function handleClearAll() {
    if (confirm('Clear all scan history? This action cannot be undone.')) {
      historyService.clearAll();
      loadRecords();
    }
  }

  function copyText(id: string, text: string, e: Event) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      copiedId = id;
      setTimeout(() => (copiedId = null), 2000);
    });
  }

  function exportCSV() {
    const csv = historyService.exportToCSV(filteredRecords);
    historyService.downloadFile(csv, `scan_history_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  function exportExcel() {
    const tsv = historyService.exportToExcelTSV(filteredRecords);
    historyService.downloadFile(tsv, `scan_history_${Date.now()}.tsv`, 'text/tab-separated-values;charset=utf-8;');
  }

  function exportJSON() {
    const json = historyService.exportToJSON(filteredRecords);
    historyService.downloadFile(json, `scan_history_${Date.now()}.json`, 'application/json');
  }

  function printLabels() {
    historyService.printLabelSheet(filteredRecords);
  }

  async function handleImport(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    try {
      const text = await files[0].text();
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        const added = historyService.importRecords(data);
        alert(`Successfully imported ${added} new records!`);
        loadRecords();
      }
    } catch {
      alert('Failed to import JSON file. Please ensure it matches the ScanCraft export format.');
    }
  }
</script>

<div class="w-full max-w-4xl mx-auto space-y-5">
  <input
    bind:this={importInput}
    type="file"
    accept=".json"
    onchange={handleImport}
    class="hidden"
  />

  <!-- Top Bar & Search -->
  <div class="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-4">
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="relative w-full sm:w-80">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search items, barcodes, notes..."
          class="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      <!-- Export & Action Buttons -->
      <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
        <button
          onclick={() => importInput?.click()}
          class="py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium border border-gray-700 transition-colors flex items-center gap-1.5"
          title="Import JSON Backup"
        >
          <Upload class="w-3.5 h-3.5 text-cyan-400" />
          <span class="hidden sm:inline">Import</span>
        </button>

        {#if records.length > 0}
          <button
            onclick={exportCSV}
            class="py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium border border-gray-700 transition-colors flex items-center gap-1.5"
            title="Export CSV"
          >
            <FileSpreadsheet class="w-3.5 h-3.5 text-emerald-400" />
            <span class="hidden sm:inline">CSV</span>
          </button>

          <button
            onclick={exportExcel}
            class="py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium border border-gray-700 transition-colors flex items-center gap-1.5"
            title="Export Excel TSV"
          >
            <FileSpreadsheet class="w-3.5 h-3.5 text-emerald-300" />
            <span class="hidden sm:inline">Excel</span>
          </button>

          <button
            onclick={printLabels}
            class="py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium border border-gray-700 transition-colors flex items-center gap-1.5"
            title="Print Barcode Label Sheet"
          >
            <Printer class="w-3.5 h-3.5 text-indigo-400" />
            <span class="hidden sm:inline">Print</span>
          </button>

          <button
            onclick={handleClearAll}
            class="py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs font-medium border border-red-800/40 transition-colors flex items-center gap-1.5"
            title="Clear all history"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Clear</span>
          </button>
        {/if}
      </div>
    </div>

    <!-- Filters Row -->
    <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-800/80 text-xs">
      <span class="text-gray-500 flex items-center gap-1">
        <Filter class="w-3 h-3" /> Filters:
      </span>

      <button
        onclick={() => (showFavoritesOnly = !showFavoritesOnly)}
        class="px-3 py-1 rounded-lg border flex items-center gap-1.5 transition-all {showFavoritesOnly
          ? 'bg-amber-950/40 border-amber-600 text-amber-300'
          : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'}"
      >
        <Star class="w-3 h-3 {showFavoritesOnly ? 'fill-amber-400' : ''}" />
        <span>Favorites</span>
      </button>

      <select
        bind:value={selectedCategory}
        class="bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1 text-gray-300 text-xs focus:outline-none"
      >
        <option value="ALL">All Categories</option>
        <option value="totp">2FA (TOTP)</option>
        <option value="product">Products</option>
        <option value="isbn">Books (ISBN)</option>
        <option value="url">URLs</option>
        <option value="wifi">Wi-Fi</option>
        <option value="calendar">Events</option>
        <option value="crypto">Crypto</option>
        <option value="vcard">Contacts</option>
        <option value="text">Plain Text</option>
      </select>
    </div>
  </div>

  <!-- History List Table / Cards -->
  <div class="space-y-2">
    {#if filteredRecords.length === 0}
      <div class="p-12 text-center bg-gray-900/60 border border-gray-800 rounded-3xl">
        <History class="w-10 h-10 text-gray-600 mx-auto mb-2 stroke-[1.5]" />
        <p class="text-sm font-medium text-gray-400">No records found</p>
        <p class="text-xs text-gray-500 mt-1">
          {searchQuery ? 'Try adjusting your search query.' : 'Scanned barcodes will appear here automatically.'}
        </p>
      </div>
    {:else}
      {#each filteredRecords as item (item.id)}
        <div
          role="button"
          tabindex="0"
          onclick={() => onSelectRecord(item)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelectRecord(item);
            }
          }}
          class="p-4 rounded-2xl bg-gray-900/90 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 transition-all cursor-pointer flex items-center justify-between gap-4 group shadow-sm"
        >
          <!-- Category Icon & Info -->
          <div class="flex items-center gap-3.5 min-w-0 flex-1">
            <div class="p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-cyan-400 shrink-0">
              {#if item.parsed.category === 'wifi'}
                <Wifi class="w-4 h-4" />
              {:else if item.parsed.category === 'totp'}
                <KeyRound class="w-4 h-4 text-emerald-400" />
              {:else if item.parsed.category === 'calendar'}
                <Calendar class="w-4 h-4 text-amber-400" />
              {:else if item.parsed.category === 'crypto'}
                <Coins class="w-4 h-4 text-amber-400" />
              {:else if item.parsed.category === 'isbn'}
                <BookOpen class="w-4 h-4 text-indigo-400" />
              {:else if item.parsed.category === 'url'}
                <ExternalLink class="w-4 h-4" />
              {:else if item.parsed.category === 'product'}
                <ShoppingBag class="w-4 h-4" />
              {:else if item.parsed.category === 'phone'}
                <Phone class="w-4 h-4" />
              {:else if item.parsed.category === 'email'}
                <Mail class="w-4 h-4" />
              {:else}
                <FileText class="w-4 h-4" />
              {/if}
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-bold text-white text-xs truncate">{item.parsed.title}</span>
                <span class="font-mono text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-cyan-300 border border-gray-700 shrink-0">
                  {item.format.replace('_', '-')}
                </span>
                {#if (item.count || 1) > 1}
                  <span class="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 shrink-0">
                    x{item.count}
                  </span>
                {/if}
              </div>
              <div class="font-mono text-xs text-gray-400 truncate max-w-lg">{item.rawText}</div>
              {#if item.notes}
                <div class="text-[11px] text-cyan-300/80 italic mt-0.5 truncate">Note: {item.notes}</div>
              {/if}
              <div class="text-[10px] text-gray-500 mt-1">
                {new Date(item.timestamp).toLocaleString()}
              </div>
            </div>
          </div>

          <!-- Item Action Buttons -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              onclick={(e) => handleToggleFavorite(item.id, e)}
              class="p-2 rounded-xl text-gray-500 hover:text-amber-400 hover:bg-gray-800 transition-colors"
              title="Favorite"
            >
              <Star class="w-4 h-4 {item.favorite ? 'fill-amber-400 text-amber-400' : ''}" />
            </button>

            <button
              onclick={(e) => copyText(item.id, item.rawText, e)}
              class="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
              title="Copy"
            >
              {#if copiedId === item.id}
                <Check class="w-4 h-4 text-emerald-400" />
              {:else}
                <Copy class="w-4 h-4" />
              {/if}
            </button>

            <button
              onclick={(e) => handleDelete(item.id, e)}
              class="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
              title="Delete"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
