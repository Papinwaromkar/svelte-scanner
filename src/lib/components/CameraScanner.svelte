<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Camera,
    RefreshCw,
    Flashlight,
    FlashlightOff,
    Volume2,
    VolumeX,
    Vibrate,
    ZoomIn,
    Pause,
    Play,
    AlertCircle,
    CheckCircle2,
    ShieldAlert,
    Maximize2,
    Minimize2,
    Sliders,
    Sparkles,
    ScanLine,
    Square,
    RectangleHorizontal
  } from '@lucide/svelte';
  import confetti from 'canvas-confetti';
  import { scannerEngine } from '../services/scanner';
  import { parseBarcodeContent } from '../services/parser';
  import { audioManager } from '../services/audio';
  import { historyService } from '../services/history';
  import type { ScanRecord, CameraDevice, SoundEffectType, VibrationPatternType, ReticleShapeType } from '../types';

  interface Props {
    onScan: (record: ScanRecord) => void;
    continuousMode?: boolean;
  }

  let { onScan, continuousMode = false }: Props = $props();

  let videoElement: HTMLVideoElement | null = $state(null);
  let canvasElement: HTMLCanvasElement | null = $state(null);
  let containerElement: HTMLDivElement | null = $state(null);

  let stream: MediaStream | null = $state(null);
  let isScanning = $state(true);
  let isPaused = $state(false);
  let isFullscreen = $state(false);
  let cameraError = $state<string | null>(null);
  let isHttpsWarning = $state(false);
  let devices = $state<CameraDevice[]>([]);
  let selectedDeviceId = $state<string>('');

  // Hardware controls
  let hasTorch = $state(false);
  let torchActive = $state(false);
  let hasZoom = $state(false);
  let minZoom = $state(1);
  let maxZoom = $state(5);
  let zoomStep = $state(0.1);
  let currentZoom = $state(1);

  // Settings & Customization
  let soundProfile = $state<SoundEffectType>('pos_beep');
  let vibrationPattern = $state<VibrationPatternType>('standard');
  let reticleShape = $state<ReticleShapeType>('auto');
  let invertScanning = $state(false);
  let cooldownIntervalMs = $derived(continuousMode ? 1000 : 1800);
  let isNativeDetector = $state(false);

  // Detected Barcode Polygon Corner Points Overlay
  let cornerPoints = $state<{ x: number; y: number }[] | null>(null);
  let clearBoxTimer: any = null;

  // Scan state
  let lastScannedText = $state('');
  let lastScannedTimestamp = $state(0);
  let animationFrameId: number | null = null;

  // Touch gesture pinch-to-zoom tracking
  let touchStartDistance = 0;
  let zoomStartLevel = 1;

  onMount(async () => {
    isNativeDetector = scannerEngine.isNativeSupported();
    await loadCameraDevices();
    await startCamera();
  });

  onDestroy(() => {
    stopCamera();
    if (clearBoxTimer) clearTimeout(clearBoxTimer);
  });

  async function loadCameraDevices() {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = allDevices.filter((d) => d.kind === 'videoinput');

      devices = videoDevs.map((d, index) => {
        const label = d.label || `Camera ${index + 1}`;
        const isBack = /back|rear|environment/i.test(label);
        return {
          deviceId: d.deviceId,
          label: label,
          facing: isBack ? 'environment' : 'user'
        };
      });

      if (devices.length > 0 && !selectedDeviceId) {
        const backCamera = devices.find((d) => d.facing === 'environment');
        selectedDeviceId = backCamera ? backCamera.deviceId : devices[0].deviceId;
      }
    } catch {
      // Permission not yet granted
    }
  }

  async function startCamera() {
    stopCamera();
    cameraError = null;
    isHttpsWarning = false;
    isPaused = false;

    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      isHttpsWarning = true;
      cameraError = 'Mobile browsers strictly require an HTTPS connection to access the device camera.';
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraError = 'Camera API is not supported on this browser or connection. Ensure HTTPS is enabled.';
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      };

      stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoElement) {
        videoElement.srcObject = stream;
        await videoElement.play();
      }

      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          hasTorch = true;
        } else {
          hasTorch = false;
        }

        if (capabilities.zoom) {
          hasZoom = true;
          minZoom = capabilities.zoom.min || 1;
          maxZoom = capabilities.zoom.max || 5;
          zoomStep = capabilities.zoom.step || 0.1;
          currentZoom = track.getSettings ? (track.getSettings() as any).zoom || minZoom : minZoom;
        } else {
          hasZoom = false;
        }
      }

      await loadCameraDevices();
      isScanning = true;
      runScanLoop();
    } catch (err: any) {
      console.error('Camera access error:', err);
      cameraError =
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission was denied. Please allow camera access in browser permissions.'
          : err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'
            ? 'No camera was found on this device.'
            : 'Unable to access camera. Please check camera settings.';
    }
  }

  function stopCamera() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    torchActive = false;
  }

  async function setZoom(val: number) {
    if (!stream || !hasZoom) return;
    const clamped = Math.min(maxZoom, Math.max(minZoom, val));
    currentZoom = clamped;

    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ zoom: clamped }]
        });
      } catch {
        // Zoom constraint
      }
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistance = Math.sqrt(dx * dx + dy * dy);
      zoomStartLevel = currentZoom;
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (e.touches.length === 2 && hasZoom && touchStartDistance > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      const factor = currentDistance / touchStartDistance;
      const newZoom = zoomStartLevel * factor;
      setZoom(newZoom);
    }
  }

  async function toggleTorch() {
    if (!stream || !hasTorch) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      torchActive = !torchActive;
      await (track as any).applyConstraints({
        advanced: [{ torch: torchActive }]
      });
    } catch {
      torchActive = !torchActive;
    }
  }

  function toggleFullscreen() {
    if (!containerElement) return;
    if (!document.fullscreenElement) {
      containerElement.requestFullscreen().then(() => (isFullscreen = true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => (isFullscreen = false)).catch(() => {});
    }
  }

  function togglePause() {
    isPaused = !isPaused;
    if (!isPaused) {
      runScanLoop();
    }
  }

  async function runScanLoop() {
    if (!isScanning || isPaused || !videoElement || videoElement.readyState < 2) {
      if (isScanning && !isPaused) {
        animationFrameId = requestAnimationFrame(runScanLoop);
      }
      return;
    }

    try {
      const result = await scannerEngine.scanFrame(videoElement, canvasElement || undefined, invertScanning);

      if (result && result.text) {
        const now = Date.now();
        const isDuplicate = result.text === lastScannedText && now - lastScannedTimestamp < cooldownIntervalMs;

        if (result.cornerPoints && videoElement) {
          cornerPoints = result.cornerPoints;
          if (clearBoxTimer) clearTimeout(clearBoxTimer);
          clearBoxTimer = setTimeout(() => (cornerPoints = null), 600);
        }

        if (!isDuplicate) {
          lastScannedText = result.text;
          lastScannedTimestamp = now;

          audioManager.playSound(soundProfile);
          audioManager.vibratePattern(vibrationPattern);

          confetti({
            particleCount: 35,
            spread: 60,
            origin: { y: 0.75 },
            colors: ['#06b6d4', '#10b981', '#6366f1']
          });

          const parsed = parseBarcodeContent(result.text, result.format);
          const record = historyService.addOrIncrement({
            rawText: result.text,
            format: result.format,
            parsed
          });

          onScan(record);
        }
      }
    } catch {
      // Ignore scan frame loop errors
    }

    if (isScanning && !isPaused) {
      animationFrameId = requestAnimationFrame(runScanLoop);
    }
  }
</script>

<div
  bind:this={containerElement}
  class="relative w-full max-w-3xl mx-auto rounded-3xl overflow-hidden bg-gray-950 border border-gray-800 shadow-2xl {isFullscreen
    ? 'fixed inset-0 z-50 max-w-none rounded-none'
    : ''}"
>
  <canvas bind:this={canvasElement} class="hidden"></canvas>

  <!-- Camera Viewport Section -->
  <div
    role="region"
    aria-label="Camera scanner viewport"
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    class="relative w-full bg-black flex items-center justify-center overflow-hidden {isFullscreen
      ? 'h-screen'
      : 'aspect-[4/3] sm:aspect-[16/10]'}"
  >
    <video
      bind:this={videoElement}
      autoplay
      playsinline
      muted
      class="w-full h-full object-cover {isPaused ? 'brightness-50' : ''}"
    ></video>

    <!-- Error State Overlay -->
    {#if cameraError}
      <div class="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-gray-950/95 backdrop-blur-md">
        <div class="p-4 rounded-2xl {isHttpsWarning ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'} mb-3">
          {#if isHttpsWarning}
            <ShieldAlert class="w-8 h-8" />
          {:else}
            <AlertCircle class="w-8 h-8" />
          {/if}
        </div>
        <h3 class="text-lg font-bold text-white mb-2">{isHttpsWarning ? 'HTTPS Required for Mobile Devices' : 'Camera Access Required'}</h3>
        <p class="text-xs sm:text-sm text-gray-400 max-w-md mb-5 leading-relaxed">{cameraError}</p>

        {#if isHttpsWarning}
          <div class="p-3.5 rounded-2xl bg-gray-900 border border-gray-800 text-xs text-gray-300 max-w-md mb-4 text-left space-y-1.5 font-mono">
            <div>1. Vite server is configured with <span class="text-cyan-400">@vitejs/plugin-basic-ssl</span>.</div>
            <div>2. Open URL on your phone using <span class="text-emerald-400 font-bold">https://</span> (not http).</div>
            <div>3. Accept the self-signed certificate warning once.</div>
          </div>
        {/if}

        <button
          onclick={startCamera}
          class="px-5 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-cyan-600/30"
        >
          <RefreshCw class="w-4 h-4" />
          <span>Retry Camera Access</span>
        </button>
      </div>
    {/if}

    <!-- Live Scanner Reticle -->
    {#if !cameraError && !isPaused}
      <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
        {#if reticleShape === 'square' || (reticleShape === 'auto')}
          <!-- Square Reticle for 2D QR Codes -->
          <div class="relative w-60 h-60 sm:w-72 sm:h-72 rounded-2xl border-2 border-cyan-400/40 shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
            <div class="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] animate-scan-laser"></div>
            <div class="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
            <div class="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
            <div class="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
            <div class="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>
          </div>
        {:else if reticleShape === 'wide'}
          <!-- Wide 16:9 Reticle for 1D Linear Barcodes -->
          <div class="relative w-72 h-36 sm:w-96 sm:h-44 rounded-2xl border-2 border-cyan-400/40 shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
            <div class="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] animate-scan-laser"></div>
            <div class="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
            <div class="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
            <div class="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
            <div class="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Paused State Badge -->
    {#if isPaused}
      <div class="absolute inset-0 z-10 flex items-center justify-center bg-black/40 pointer-events-none">
        <div class="px-4 py-2 rounded-2xl bg-gray-900/90 border border-gray-700 text-white text-xs font-medium flex items-center gap-2 shadow-xl backdrop-blur-sm">
          <Pause class="w-4 h-4 text-amber-400" />
          <span>Scanner Paused</span>
        </div>
      </div>
    {/if}

    <!-- Top Viewport Floating HUD -->
    <div class="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-none">
      <div class="flex items-center gap-2 bg-gray-950/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-gray-800 text-xs text-gray-300 pointer-events-auto">
        <span class="w-2 h-2 rounded-full {isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}"></span>
        <span class="font-medium">{isPaused ? 'Paused' : '60 FPS Active'}</span>
      </div>

      <!-- Quick Action Floating Buttons -->
      <div class="flex items-center gap-1.5 pointer-events-auto bg-gray-950/80 backdrop-blur-md p-1 rounded-2xl border border-gray-800">
        {#if hasTorch}
          <button
            onclick={toggleTorch}
            class="p-2 rounded-xl transition-colors {torchActive ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}"
            title={torchActive ? 'Turn off flashlight' : 'Turn on flashlight'}
          >
            {#if torchActive}
              <Flashlight class="w-4 h-4" />
            {:else}
              <FlashlightOff class="w-4 h-4" />
            {/if}
          </button>
        {/if}

        <button
          onclick={() => (invertScanning = !invertScanning)}
          class="p-2 rounded-xl transition-colors {invertScanning ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}"
          title="Invert QR Colors (White on Black)"
        >
          <Sparkles class="w-4 h-4" />
        </button>

        <button
          onclick={toggleFullscreen}
          class="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title="Toggle Fullscreen Mode"
        >
          {#if isFullscreen}
            <Minimize2 class="w-4 h-4" />
          {:else}
            <Maximize2 class="w-4 h-4" />
          {/if}
        </button>

        <button
          onclick={togglePause}
          class="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title={isPaused ? 'Resume camera scanning' : 'Pause scanning'}
        >
          {#if isPaused}
            <Play class="w-4 h-4 text-emerald-400" />
          {:else}
            <Pause class="w-4 h-4" />
          {/if}
        </button>
      </div>
    </div>

    <!-- Floating Zoom Pills on bottom of video (if supported) -->
    {#if hasZoom}
      <div class="absolute bottom-3 inset-x-3 flex items-center justify-center gap-2 z-20 pointer-events-none">
        <div class="flex items-center gap-1 bg-gray-950/80 backdrop-blur-md p-1 rounded-2xl border border-gray-800 pointer-events-auto shadow-lg">
          <button
            onclick={() => setZoom(1)}
            class="px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition-colors {Math.abs(currentZoom - 1) < 0.2 ? 'bg-cyan-500 text-black' : 'text-gray-300 hover:bg-gray-800'}"
          >
            1x
          </button>
          {#if maxZoom >= 2}
            <button
              onclick={() => setZoom(2)}
              class="px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition-colors {Math.abs(currentZoom - 2) < 0.2 ? 'bg-cyan-500 text-black' : 'text-gray-300 hover:bg-gray-800'}"
            >
              2x
            </button>
          {/if}
          {#if maxZoom >= 3}
            <button
              onclick={() => setZoom(3)}
              class="px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition-colors {Math.abs(currentZoom - 3) < 0.2 ? 'bg-cyan-500 text-black' : 'text-gray-300 hover:bg-gray-800'}"
            >
              3x
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Bottom Hardware & Settings Control Panel -->
  <div class="p-5 bg-gray-900 border-t border-gray-800 space-y-4">
    <!-- Camera device selection & Reticle shape selector -->
    <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
      <div class="sm:col-span-7">
        <label for="camera-select-prod" class="block text-xs font-medium text-gray-400 mb-1">Camera Lens Source</label>
        <div class="flex items-center gap-2">
          <select
            id="camera-select-prod"
            bind:value={selectedDeviceId}
            onchange={startCamera}
            class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50"
          >
            {#if devices.length === 0}
              <option value="">Default / Environment Camera</option>
            {:else}
              {#each devices as dev}
                <option value={dev.deviceId}>{dev.label}</option>
              {/each}
            {/if}
          </select>

          <button
            onclick={startCamera}
            class="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors shrink-0"
            title="Reload camera stream"
          >
            <RefreshCw class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Reticle Framing Selector -->
      <div class="sm:col-span-5">
        <span class="block text-xs font-medium text-gray-400 mb-1">Framing Target</span>
        <div class="flex items-center p-1 bg-gray-950 border border-gray-800 rounded-xl">
          <button
            onclick={() => (reticleShape = 'square')}
            class="flex-1 py-1 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors {reticleShape === 'square' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}"
            title="Square framing (2D QR Code)"
          >
            <Square class="w-3.5 h-3.5" />
            <span>Square</span>
          </button>

          <button
            onclick={() => (reticleShape = 'wide')}
            class="flex-1 py-1 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors {reticleShape === 'wide' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}"
            title="Wide framing (1D Linear Barcode)"
          >
            <RectangleHorizontal class="w-3.5 h-3.5" />
            <span>Wide 1D</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Fine Zoom Slider (if hardware supported) -->
    {#if hasZoom}
      <div class="flex items-center gap-3 pt-1 border-t border-gray-800/80">
        <ZoomIn class="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          step={zoomStep}
          value={currentZoom}
          oninput={(e) => setZoom(parseFloat((e.target as HTMLInputElement).value))}
          class="w-full accent-cyan-500 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer"
        />
        <span class="text-xs font-mono text-cyan-400 w-12 text-right">{currentZoom.toFixed(1)}x</span>
      </div>
    {/if}

    <!-- Audio Profile & Vibration controls -->
    <div class="pt-2 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2">
        <Volume2 class="w-3.5 h-3.5 text-gray-400" />
        <label for="sound-profile-select" class="text-gray-400">Beep Audio:</label>
        <select
          id="sound-profile-select"
          bind:value={soundProfile}
          class="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-gray-300 text-xs focus:outline-none"
        >
          <option value="pos_beep">Classic POS Beep</option>
          <option value="modern_chime">Modern Chime</option>
          <option value="futuristic_ping">Futuristic Ping</option>
          <option value="double_chirp">Double Chirp</option>
          <option value="subtle_click">Subtle Click</option>
          <option value="mute">Mute</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <Vibrate class="w-3.5 h-3.5 text-gray-400" />
        <label for="vibrate-pattern-select" class="text-gray-400">Haptic Buzz:</label>
        <select
          id="vibrate-pattern-select"
          bind:value={vibrationPattern}
          class="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-gray-300 text-xs focus:outline-none"
        >
          <option value="crisp">Crisp (35ms)</option>
          <option value="standard">Standard (75ms)</option>
          <option value="double">Double Pulse</option>
          <option value="heavy">Heavy (140ms)</option>
          <option value="off">Off</option>
        </select>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes scanLaser {
    0% {
      top: 0%;
      opacity: 0.8;
    }
    50% {
      top: 100%;
      opacity: 1;
    }
    100% {
      top: 0%;
      opacity: 0.8;
    }
  }

  .animate-scan-laser {
    animation: scanLaser 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }
</style>
