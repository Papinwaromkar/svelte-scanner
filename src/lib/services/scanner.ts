import {
  MultiFormatReader,
  BarcodeFormat as ZXingBarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  InvertedLuminanceSource
} from '@zxing/library';
import jsQR from 'jsqr';
import type { BarcodeFormatType } from '../types';

export interface ScanResult {
  text: string;
  format: BarcodeFormatType;
  cornerPoints?: { x: number; y: number }[];
}

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

export class ScannerEngine {
  private zxingReader: MultiFormatReader;
  private hasNativeBarcodeDetector: boolean = false;
  private nativeDetector: any = null;

  constructor() {
    this.zxingReader = new MultiFormatReader();
    const hints = new Map<DecodeHintType, any>();
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

    this.initNativeBarcodeDetector();
  }

  private async initNativeBarcodeDetector() {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        const supported = await BarcodeDetectorClass.getSupportedFormats();
        if (supported && supported.length > 0) {
          this.nativeDetector = new BarcodeDetectorClass({ formats: supported });
          this.hasNativeBarcodeDetector = true;
        }
      } catch {
        this.hasNativeBarcodeDetector = false;
      }
    }
  }

  public isNativeSupported(): boolean {
    return this.hasNativeBarcodeDetector;
  }

  /**
   * Decodes an HTMLVideoElement or HTMLCanvasElement frame
   */
  public async scanFrame(
    source: HTMLVideoElement | HTMLCanvasElement,
    canvas?: HTMLCanvasElement,
    scanInverted = false
  ): Promise<ScanResult | null> {
    // 1. Try Native BarcodeDetector first (GPU / Hardware accelerated)
    if (this.hasNativeBarcodeDetector && this.nativeDetector) {
      try {
        const barcodes = await this.nativeDetector.detect(source);
        if (barcodes && barcodes.length > 0) {
          const first = barcodes[0];
          const format = this.normalizeNativeFormat(first.format);
          return {
            text: first.rawValue,
            format,
            cornerPoints: first.cornerPoints
          };
        }
      } catch {
        // Fallback to JS engines
      }
    }

    // 2. Prepare canvas & pixel data
    let targetCanvas: HTMLCanvasElement;
    if (source instanceof HTMLCanvasElement) {
      targetCanvas = source;
    } else {
      if (!canvas) {
        targetCanvas = document.createElement('canvas');
      } else {
        targetCanvas = canvas;
      }
      const width = source.videoWidth;
      const height = source.videoHeight;
      if (width === 0 || height === 0) return null;

      if (targetCanvas.width !== width || targetCanvas.height !== height) {
        targetCanvas.width = width;
        targetCanvas.height = height;
      }
      const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(source, 0, 0, width, height);
    }

    const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const width = targetCanvas.width;
    const height = targetCanvas.height;
    if (width === 0 || height === 0) return null;

    const imageData = ctx.getImageData(0, 0, width, height);

    // 3. Try jsQR for rapid QR Code detection
    try {
      const qrCode = jsQR(imageData.data, width, height, {
        inversionAttempts: scanInverted ? 'invertFirst' : 'attemptBoth'
      });
      if (qrCode && qrCode.data) {
        return {
          text: qrCode.data,
          format: 'QR_CODE',
          cornerPoints: [
            qrCode.location.topLeftCorner,
            qrCode.location.topRightCorner,
            qrCode.location.bottomRightCorner,
            qrCode.location.bottomLeftCorner
          ]
        };
      }
    } catch {
      // Continue to ZXing
    }

    // 4. Try ZXing MultiFormatReader
    try {
      const luminanceSource = new RGBLuminanceSource(
        Uint8ClampedArray.from(imageData.data),
        width,
        height
      );
      const binaryBitmap = new BinaryBitmap(
        new HybridBinarizer(
          scanInverted ? new InvertedLuminanceSource(luminanceSource) : luminanceSource
        )
      );
      const result = this.zxingReader.decodeWithState(binaryBitmap);

      if (result && result.getText()) {
        const format = ZXING_FORMAT_MAP.get(result.getBarcodeFormat()) || 'UNKNOWN';
        const points = result.getResultPoints()?.map(p => ({ x: p.getX(), y: p.getY() }));
        return {
          text: result.getText(),
          format,
          cornerPoints: points
        };
      }
    } catch {
      // No barcode detected
    } finally {
      this.zxingReader.reset();
    }

    return null;
  }

  /**
   * Decodes an image file and supports finding multiple barcodes
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

        // 1. If native detector is supported, try detecting all barcodes
        if (this.hasNativeBarcodeDetector && this.nativeDetector) {
          try {
            const detected = await this.nativeDetector.detect(canvas);
            if (detected && detected.length > 0) {
              for (const b of detected) {
                results.push({
                  text: b.rawValue,
                  format: this.normalizeNativeFormat(b.format),
                  cornerPoints: b.cornerPoints
                });
              }
              resolve(results);
              return;
            }
          } catch {
            // Fallback
          }
        }

        // 2. Standard scan pass
        const primary = await this.scanFrame(canvas, undefined, false);
        if (primary) results.push(primary);

        // 3. Inverted scan pass (if nothing found)
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
      'qr_code': 'QR_CODE',
      'ean_13': 'EAN_13',
      'ean_8': 'EAN_8',
      'upc_a': 'UPC_A',
      'upc_e': 'UPC_E',
      'code_128': 'CODE_128',
      'code_39': 'CODE_39',
      'code_93': 'CODE_93',
      'itf': 'ITF',
      'data_matrix': 'DATA_MATRIX',
      'aztec': 'AZTEC',
      'pdf417': 'PDF_417',
      'codabar': 'CODABAR'
    };
    return map[nativeFormat.toLowerCase()] || 'UNKNOWN';
  }
}

export const scannerEngine = new ScannerEngine();
