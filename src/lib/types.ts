export type BarcodeFormatType =
  | 'QR_CODE'
  | 'AZTEC'
  | 'CODABAR'
  | 'CODE_39'
  | 'CODE_93'
  | 'CODE_128'
  | 'DATA_MATRIX'
  | 'EAN_8'
  | 'EAN_13'
  | 'ITF'
  | 'MAXICODE'
  | 'PDF_417'
  | 'RSS_14'
  | 'RSS_EXPANDED'
  | 'UPC_A'
  | 'UPC_E'
  | 'UPC_EAN_EXTENSION'
  | 'UNKNOWN';

export type ContentCategory =
  | 'url'
  | 'wifi'
  | 'vcard'
  | 'totp'
  | 'calendar'
  | 'crypto'
  | 'product'
  | 'isbn'
  | 'epc_payment'
  | 'email'
  | 'phone'
  | 'sms'
  | 'geo'
  | 'upi'
  | 'text';

export interface WifiData {
  ssid: string;
  password?: string;
  encryption?: 'WPA' | 'WEP' | 'nopass' | 'WPA2' | 'WPA3' | string;
  hidden?: boolean;
}

export interface VCardData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  title?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  url?: string;
  address?: string;
  note?: string;
}

export interface TotpData {
  issuer?: string;
  account?: string;
  secret: string;
  algorithm?: string;
  digits?: number;
  period?: number;
}

export interface CalendarEventData {
  title: string;
  description?: string;
  location?: string;
  startTime?: Date;
  endTime?: Date;
  isAllDay?: boolean;
  rawIcs?: string;
}

export interface CryptoData {
  currency: 'BTC' | 'ETH' | 'SOL' | 'USDT' | 'UNKNOWN';
  address: string;
  amount?: string;
  label?: string;
  explorerUrl: string;
}

export interface EpcPaymentData {
  iban: string;
  bic?: string;
  beneficiaryName: string;
  amount?: string;
  currency?: string;
  reference?: string;
  purpose?: string;
}

export interface GeoData {
  latitude: number;
  longitude: number;
  altitude?: number;
  query?: string;
}

export interface ChecksumValidation {
  hasChecksum: boolean;
  isValid: boolean;
  expectedDigit?: string;
  actualDigit?: string;
}

export interface ParsedContent {
  category: ContentCategory;
  raw: string;
  title: string;
  description: string;
  url?: string;
  wifi?: WifiData;
  vcard?: VCardData;
  totp?: TotpData;
  calendar?: CalendarEventData;
  crypto?: CryptoData;
  epc?: EpcPaymentData;
  geo?: GeoData;
  phone?: string;
  email?: string;
  sms?: { number: string; message?: string };
  productCode?: string;
  isbn?: string;
  checksum?: ChecksumValidation;
  upi?: { pa?: string; pn?: string; am?: string; cu?: string; tn?: string };
}

export interface ScanRecord {
  id: string;
  rawText: string;
  format: BarcodeFormatType;
  parsed: ParsedContent;
  timestamp: number;
  count?: number; // for inventory / continuous mode
  favorite?: boolean;
  notes?: string;
  tags?: string[];
}

export type SoundEffectType = 'pos_beep' | 'modern_chime' | 'futuristic_ping' | 'double_chirp' | 'subtle_click' | 'mute';
export type VibrationPatternType = 'crisp' | 'standard' | 'double' | 'heavy' | 'off';
export type ReticleShapeType = 'auto' | 'square' | 'wide' | 'fullscreen';

export interface ScannerSettings {
  soundEffect: SoundEffectType;
  soundVolume: number;
  vibrationPattern: VibrationPatternType;
  reticleShape: ReticleShapeType;
  continuousCooldownMs: number;
  autoOpenUrls: boolean;
  preferredCamera: 'environment' | 'user' | string;
  preferredResolution: '1080p' | '720p' | '4k';
  invertQrScanning: boolean;
  highlightBoxColor: string;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  facing?: 'environment' | 'user' | 'unknown';
}
