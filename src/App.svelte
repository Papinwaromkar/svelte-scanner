<script lang="ts">
  import {
    Camera,
    Upload,
    Boxes,
    QrCode,
    History,
    Sparkles,
    ShieldCheck,
    Info
  } from '@lucide/svelte';
  import CameraScanner from './lib/components/CameraScanner.svelte';
  import ImageScanner from './lib/components/ImageScanner.svelte';
  import BatchInventory from './lib/components/BatchInventory.svelte';
  import CodeGenerator from './lib/components/CodeGenerator.svelte';
  import ScanHistory from './lib/components/ScanHistory.svelte';
  import FeaturesGuide from './lib/components/FeaturesGuide.svelte';
  import ResultModal from './lib/components/ResultModal.svelte';
  import type { ScanRecord } from './lib/types';

  type TabType = 'camera' | 'upload' | 'batch' | 'generate' | 'history' | 'guide';

  let activeTab = $state<TabType>('camera');
  let activeRecord = $state<ScanRecord | null>(null);
  let generatorInitialText = $state<string>('');

  function handleScan(record: ScanRecord) {
    activeRecord = record;
  }

  function handleSelectFromHistory(record: ScanRecord) {
    activeRecord = record;
  }

  function handleCloseModal() {
    activeRecord = null;
  }

  function handleReGenerate(text: string) {
    generatorInitialText = text;
    activeTab = 'generate';
  }
</script>

<div class="min-h-screen bg-gray-950 text-gray-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
  <!-- Top Navigation Header -->
  <header class="sticky top-0 z-40 bg-gray-950/85 backdrop-blur-xl border-b border-gray-800/80 px-4 sm:px-8 py-3.5">
    <div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
      <!-- App Brand -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20">
          <div class="w-full h-full bg-gray-950 rounded-[14px] flex items-center justify-center text-cyan-400">
            <QrCode class="w-5 h-5" />
          </div>
        </div>
        <div>
          <h1 class="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <span>ScanCraft</span>
            <span class="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 hidden sm:inline-block">
              100% Client-Side
            </span>
          </h1>
          <p class="text-[11px] text-gray-400 hidden sm:block">Universal Barcode & QR Code Engine</p>
        </div>
      </div>

      <!-- Offline & Privacy Indicator -->
      <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-xs text-gray-300">
        <ShieldCheck class="w-3.5 h-3.5 text-emerald-400" />
        <span class="font-medium text-[11px]">Private & Offline Ready</span>
      </div>
    </div>
  </header>

  <!-- Navigation Tab Bar -->
  <nav class="bg-gray-950 border-b border-gray-850 px-4 overflow-x-auto py-2">
    <div class="max-w-4xl mx-auto flex items-center justify-start sm:justify-center gap-1.5 min-w-max">
      <button
        onclick={() => (activeTab = 'camera')}
        class="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all {activeTab ===
        'camera'
          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
          : 'text-gray-400 hover:text-white hover:bg-gray-900'}"
      >
        <Camera class="w-4 h-4" />
        <span>Live Camera</span>
      </button>

      <button
        onclick={() => (activeTab = 'upload')}
        class="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all {activeTab ===
        'upload'
          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
          : 'text-gray-400 hover:text-white hover:bg-gray-900'}"
      >
        <Upload class="w-4 h-4" />
        <span>Upload & Paste</span>
      </button>

      <button
        onclick={() => (activeTab = 'batch')}
        class="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all {activeTab ===
        'batch'
          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
          : 'text-gray-400 hover:text-white hover:bg-gray-900'}"
      >
        <Boxes class="w-4 h-4" />
        <span>Batch Inventory</span>
      </button>

      <button
        onclick={() => (activeTab = 'generate')}
        class="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all {activeTab ===
        'generate'
          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
          : 'text-gray-400 hover:text-white hover:bg-gray-900'}"
      >
        <QrCode class="w-4 h-4" />
        <span>Generator</span>
      </button>

      <button
        onclick={() => (activeTab = 'history')}
        class="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all {activeTab ===
        'history'
          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
          : 'text-gray-400 hover:text-white hover:bg-gray-900'}"
      >
        <History class="w-4 h-4" />
        <span>Scan History</span>
      </button>

      <button
        onclick={() => (activeTab = 'guide')}
        class="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all {activeTab ===
        'guide'
          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
          : 'text-gray-400 hover:text-white hover:bg-gray-900'}"
      >
        <Sparkles class="w-4 h-4 text-cyan-400" />
        <span>Tech Specs</span>
      </button>
    </div>
  </nav>

  <!-- Main Content Container -->
  <main class="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-start">
    {#if activeTab === 'camera'}
      <div class="space-y-4 animate-fade-in">
        <CameraScanner onScan={handleScan} />
      </div>
    {:else if activeTab === 'upload'}
      <div class="space-y-4 animate-fade-in">
        <ImageScanner onScan={handleScan} />
      </div>
    {:else if activeTab === 'batch'}
      <div class="space-y-4 animate-fade-in">
        <BatchInventory />
      </div>
    {:else if activeTab === 'generate'}
      <div class="space-y-4 animate-fade-in">
        <CodeGenerator initialText={generatorInitialText} />
      </div>
    {:else if activeTab === 'history'}
      <div class="space-y-4 animate-fade-in">
        <ScanHistory onSelectRecord={handleSelectFromHistory} />
      </div>
    {:else if activeTab === 'guide'}
      <div class="space-y-4 animate-fade-in">
        <FeaturesGuide />
      </div>
    {/if}
  </main>

  <!-- Scan Result Detail Modal -->
  <ResultModal
    record={activeRecord}
    onClose={handleCloseModal}
    onGenerate={handleReGenerate}
  />

  <!-- Footer -->
  <footer class="mt-auto border-t border-gray-900 py-4 px-6 text-center text-xs text-gray-400">
    <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
      <span>Built with Svelte 5 + TypeScript + Vite • 100% Client-Side Web Application</span>
      <span>No data or video is ever transmitted to a server</span>
    </div>
  </footer>
</div>
