import {
	MultiFormatReader,
	BarcodeFormat as ZXingBarcodeFormat,
	DecodeHintType,
	BinaryBitmap,
	HybridBinarizer,
	HTMLCanvasElementLuminanceSource
} from '@zxing/library';
import type { BarcodeFormatType } from '../types';

export interface ScanResult {
	text: string;
	format: BarcodeFormatType;
	cornerPoints?: { x: number; y: number }[];
}

type NativeBarcodeHit = {
	rawValue: string;
	format: string;
	cornerPoints?: Array<{ x: number; y: number }>;
};

type NativeBarcodeDetector = {
	detect: (source: ImageBitmapSource) => Promise<NativeBarcodeHit[]>;
};

const ZXING_FORMAT_MAP = new Map<ZXingBarcodeFormat, BarcodeFormatType>([
	[ZXingBarcodeFormat.QR_CODE, 'QR_CODE'],
	[ZXingBarcodeFormat.AZTEC, 'AZTEC'],
	[ZXingBarcodeFormat.CODABAR, 'CODABAR'],
	[ZXingBarcodeFormat.CODE_39, 'CODE_39'],
	[ZXingBarcodeFormat.CODE_93, 'CODE_93'],
	[ZXingBarcodeFormat.CODE_128, 'CODE_128'],
	[ZXingBarcodeFormat.DATA_MATRIX, 'DATA_MATRIX'],
	[ZXingBarcodeFormat.EAN_8, 'EAN_8'],
	[ZXingBarcodeFormat.EAN_13, 'EAN_13'],
	[ZXingBarcodeFormat.ITF, 'ITF'],
	[ZXingBarcodeFormat.MAXICODE, 'MAXICODE'],
	[ZXingBarcodeFormat.PDF_417, 'PDF_417'],
	[ZXingBarcodeFormat.RSS_14, 'RSS_14'],
	[ZXingBarcodeFormat.RSS_EXPANDED, 'RSS_EXPANDED'],
	[ZXingBarcodeFormat.UPC_A, 'UPC_A'],
	[ZXingBarcodeFormat.UPC_E, 'UPC_E'],
	[ZXingBarcodeFormat.UPC_EAN_EXTENSION, 'UPC_EAN_EXTENSION']
]);

/** Prefer these formats when the native API supports them. */
const PREFERRED_NATIVE_FORMATS = [
	'qr_code',
	'code_128',
	'code_39',
	'ean_13',
	'ean_8',
	'upc_a',
	'upc_e',
	'data_matrix',
	'aztec',
	'pdf417',
	'itf',
	'codabar'
] as const;

/** Cap decode resolution so laptop webcams stay responsive. */
const MAX_DECODE_EDGE = 720;

export class ScannerEngine {
	private zxingReader: MultiFormatReader;
	private hasNativeBarcodeDetector = false;
	private nativeDetector: NativeBarcodeDetector | null = null;
	private nativeInitPromise: Promise<void>;
	private invertToggle = false;

	constructor() {
		this.zxingReader = new MultiFormatReader();
		const hints = new Map();
		hints.set(DecodeHintType.POSSIBLE_FORMATS, [
			ZXingBarcodeFormat.QR_CODE,
			ZXingBarcodeFormat.EAN_13,
			ZXingBarcodeFormat.EAN_8,
			ZXingBarcodeFormat.CODE_128,
			ZXingBarcodeFormat.CODE_39,
			ZXingBarcodeFormat.CODE_93,
			ZXingBarcodeFormat.UPC_A,
			ZXingBarcodeFormat.UPC_E,
			ZXingBarcodeFormat.ITF,
			ZXingBarcodeFormat.DATA_MATRIX,
			ZXingBarcodeFormat.AZTEC,
			ZXingBarcodeFormat.PDF_417,
			ZXingBarcodeFormat.CODABAR
		]);
		hints.set(DecodeHintType.TRY_HARDER, true);
		this.zxingReader.setHints(hints);

		this.nativeInitPromise = this.initNativeBarcodeDetector();
	}

	private async initNativeBarcodeDetector() {
		if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return;

		try {
			const BarcodeDetectorClass = (
				window as unknown as {
					BarcodeDetector: {
						getSupportedFormats: () => Promise<string[]>;
						new (options?: { formats?: string[] }): NativeBarcodeDetector;
					};
				}
			).BarcodeDetector;

			const supported = await BarcodeDetectorClass.getSupportedFormats();
			if (!supported?.length) return;

			const formats = PREFERRED_NATIVE_FORMATS.filter((f) => supported.includes(f));
			this.nativeDetector = new BarcodeDetectorClass({
				formats: formats.length > 0 ? [...formats] : supported
			});
			this.hasNativeBarcodeDetector = true;
		} catch {
			this.hasNativeBarcodeDetector = false;
			this.nativeDetector = null;
		}
	}

	/** Wait until native BarcodeDetector probing has finished (success or fallback). */
	public async ready(): Promise<void> {
		await this.nativeInitPromise;
	}

	public isNativeSupported(): boolean {
		return this.hasNativeBarcodeDetector;
	}

	/**
	 * Draw the video/canvas source into a downscaled working canvas for decode.
	 * Returns null if the frame is not ready yet.
	 */
	private prepareDecodeCanvas(
		source: HTMLVideoElement | HTMLCanvasElement,
		canvas?: HTMLCanvasElement
	): HTMLCanvasElement | null {
		const target = canvas ?? document.createElement('canvas');

		let srcW: number;
		let srcH: number;
		if (source instanceof HTMLVideoElement) {
			srcW = source.videoWidth;
			srcH = source.videoHeight;
		} else {
			srcW = source.width;
			srcH = source.height;
		}
		if (srcW === 0 || srcH === 0) return null;

		const scale = Math.min(1, MAX_DECODE_EDGE / Math.max(srcW, srcH));
		const width = Math.max(1, Math.floor(srcW * scale));
		const height = Math.max(1, Math.floor(srcH * scale));

		if (target.width !== width || target.height !== height) {
			target.width = width;
			target.height = height;
		}

		const ctx = target.getContext('2d', { willReadFrequently: true });
		if (!ctx) return null;
		ctx.drawImage(source, 0, 0, width, height);
		return target;
	}

	private async detectNative(source: ImageBitmapSource): Promise<ScanResult | null> {
		if (!this.hasNativeBarcodeDetector || !this.nativeDetector) return null;
		try {
			const barcodes = await this.nativeDetector.detect(source);
			if (!barcodes?.length) return null;
			const first = barcodes[0];
			return {
				text: first.rawValue,
				format: this.normalizeNativeFormat(first.format),
				cornerPoints: first.cornerPoints?.map((p) => ({ x: p.x, y: p.y }))
			};
		} catch {
			return null;
		}
	}

	private detectZXing(canvas: HTMLCanvasElement, scanInverted: boolean): ScanResult | null {
		try {
			// HTMLCanvasElementLuminanceSource correctly converts RGBA → greyscale.
			// Passing imageData.data (RGBA) into RGBLuminanceSource does NOT — that was a silent no-op decode.
			const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas, scanInverted);
			const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
			const result = this.zxingReader.decodeWithState(binaryBitmap);

			if (!result?.getText()) return null;

			const format = ZXING_FORMAT_MAP.get(result.getBarcodeFormat()) || 'UNKNOWN';
			const points = result.getResultPoints()?.map((p) => ({ x: p.getX(), y: p.getY() }));
			return {
				text: result.getText(),
				format,
				cornerPoints: points
			};
		} catch {
			return null;
		} finally {
			this.zxingReader.reset();
		}
	}

	/**
	 * Decodes an HTMLVideoElement or HTMLCanvasElement frame.
	 */
	public async scanFrame(
		source: HTMLVideoElement | HTMLCanvasElement,
		canvas?: HTMLCanvasElement,
		scanInverted = false
	): Promise<ScanResult | null> {
		// Native can take a video element directly (fast path on Chromium mobile).
		if (source instanceof HTMLVideoElement) {
			const fromVideo = await this.detectNative(source);
			if (fromVideo) return fromVideo;
		}

		const decodeCanvas = this.prepareDecodeCanvas(source, canvas);
		if (!decodeCanvas) return null;

		// Desktop BarcodeDetector is often more reliable on a canvas/bitmap than on <video>.
		const fromCanvas = await this.detectNative(decodeCanvas);
		if (fromCanvas) return fromCanvas;

		const invert = scanInverted || this.invertToggle;
		this.invertToggle = !this.invertToggle;

		return this.detectZXing(decodeCanvas, invert);
	}

	/**
	 * Decodes an image file and supports finding multiple barcodes.
	 */
	public async scanImageFile(file: File | Blob): Promise<ScanResult[]> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const url = URL.createObjectURL(file);

			img.onload = async () => {
				URL.revokeObjectURL(url);
				const canvas = document.createElement('canvas');
				canvas.width = img.naturalWidth || img.width;
				canvas.height = img.naturalHeight || img.height;
				const ctx = canvas.getContext('2d', { willReadFrequently: true });
				if (!ctx) {
					resolve([]);
					return;
				}
				ctx.drawImage(img, 0, 0);

				const results: ScanResult[] = [];

				if (this.hasNativeBarcodeDetector && this.nativeDetector) {
					try {
						const detected = await this.nativeDetector.detect(canvas);
						if (detected?.length) {
							for (const b of detected) {
								results.push({
									text: b.rawValue,
									format: this.normalizeNativeFormat(b.format),
									cornerPoints: b.cornerPoints?.map((p) => ({ x: p.x, y: p.y }))
								});
							}
							resolve(results);
							return;
						}
					} catch {
						// Fallback to ZXing
					}
				}

				const primary = await this.scanFrame(canvas, undefined, false);
				if (primary) results.push(primary);

				if (results.length === 0) {
					const inverted = await this.scanFrame(canvas, undefined, true);
					if (inverted) results.push(inverted);
				}

				resolve(results);
			};

			img.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error('Failed to load image file'));
			};

			img.src = url;
		});
	}

	private normalizeNativeFormat(nativeFormat: string): BarcodeFormatType {
		const map: Record<string, BarcodeFormatType> = {
			qr_code: 'QR_CODE',
			ean_13: 'EAN_13',
			ean_8: 'EAN_8',
			upc_a: 'UPC_A',
			upc_e: 'UPC_E',
			code_128: 'CODE_128',
			code_39: 'CODE_39',
			code_93: 'CODE_93',
			itf: 'ITF',
			data_matrix: 'DATA_MATRIX',
			aztec: 'AZTEC',
			pdf417: 'PDF_417',
			codabar: 'CODABAR'
		};
		return map[nativeFormat.toLowerCase()] || 'UNKNOWN';
	}
}

export const scannerEngine = new ScannerEngine();
