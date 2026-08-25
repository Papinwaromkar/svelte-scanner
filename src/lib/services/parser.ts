import type {
  BarcodeFormatType,
  ContentCategory,
  ParsedContent,
  WifiData,
  VCardData,
  TotpData,
  CalendarEventData,
  CryptoData,
  EpcPaymentData,
  GeoData,
  ChecksumValidation
} from '../types';

export function parseBarcodeContent(rawText: string, format: BarcodeFormatType): ParsedContent {
  const text = (rawText || '').trim();

  // 1. 2FA / TOTP Authenticator (otpauth://totp/...)
  if (text.startsWith('otpauth://totp/')) {
    const totp = parseTotpUri(text);
    return {
      category: 'totp',
      raw: text,
      title: `${totp.issuer || '2FA'}: ${totp.account || 'Account'}`,
      description: `Time-based 2FA Code (30s interval • ${totp.digits || 6} digits)`,
      totp
    };
  }

  // 2. Wi-Fi QR Code (WIFI:S:SSID;T:WPA;P:Password;H:false;;)
  if (text.startsWith('WIFI:') || text.startsWith('wifi:')) {
    const wifi = parseWifiString(text);
    return {
      category: 'wifi',
      raw: text,
      title: `Wi-Fi: ${wifi.ssid}`,
      description: `Security: ${wifi.encryption || 'None'}${wifi.password ? ' • Password protected' : ' • Open'}`,
      wifi
    };
  }

  // 3. Calendar Event (BEGIN:VEVENT ... END:VEVENT or BEGIN:VCALENDAR)
  if (text.includes('BEGIN:VEVENT') || text.includes('BEGIN:VCALENDAR')) {
    const calendar = parseCalendarEvent(text);
    return {
      category: 'calendar',
      raw: text,
      title: calendar.title || 'Calendar Event',
      description: [calendar.location, calendar.startTime?.toLocaleString()].filter(Boolean).join(' • ') || 'Event Details',
      calendar
    };
  }

  // 4. vCard or MeCard (BEGIN:VCARD ... END:VCARD)
  if (text.includes('BEGIN:VCARD') || text.startsWith('MECARD:')) {
    const vcard = parseContactString(text);
    const name = vcard.fullName || `${vcard.firstName || ''} ${vcard.lastName || ''}`.trim() || 'Contact';
    return {
      category: 'vcard',
      raw: text,
      title: name,
      description: [vcard.organization, vcard.phone, vcard.email].filter(Boolean).join(' • ') || 'Contact Card',
      vcard
    };
  }

  // 5. Crypto Address (Bitcoin, Ethereum, Solana)
  const cryptoData = parseCryptoAddress(text);
  if (cryptoData) {
    return {
      category: 'crypto',
      raw: text,
      title: `${cryptoData.currency} Address`,
      description: `${cryptoData.address.slice(0, 8)}...${cryptoData.address.slice(-6)}${cryptoData.amount ? ` • ${cryptoData.amount} ${cryptoData.currency}` : ''}`,
      crypto: cryptoData
    };
  }

  // 6. EPC SEPA Bank Transfer QR (BCD\n001\n1\nSCT...)
  if (text.startsWith('BCD\n') || text.startsWith('BCD\r\n')) {
    const epc = parseEpcPayment(text);
    if (epc) {
      return {
        category: 'epc_payment',
        raw: text,
        title: `SEPA: ${epc.beneficiaryName}`,
        description: `IBAN: ${epc.iban}${epc.amount ? ` • €${epc.amount}` : ''}`,
        epc
      };
    }
  }

  // 7. Email (mailto: or MATMSG:)
  if (text.startsWith('mailto:') || text.startsWith('MATMSG:') || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text)) {
    const emailInfo = parseEmailString(text);
    return {
      category: 'email',
      raw: text,
      title: emailInfo.email || text,
      description: 'Email Address',
      email: emailInfo.email,
      url: text.startsWith('mailto:') ? text : `mailto:${emailInfo.email}`
    };
  }

  // 8. Telephone (tel:)
  if (text.startsWith('tel:') || (/^(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})$/.test(text) && text.length >= 7)) {
    const cleanPhone = text.replace(/^tel:/i, '').trim();
    return {
      category: 'phone',
      raw: text,
      title: cleanPhone,
      description: 'Phone Number',
      phone: cleanPhone,
      url: `tel:${cleanPhone}`
    };
  }

  // 9. SMS (sms: or SMSTO:)
  if (text.startsWith('sms:') || text.startsWith('SMSTO:')) {
    const sms = parseSmsString(text);
    return {
      category: 'sms',
      raw: text,
      title: `SMS to ${sms.number}`,
      description: sms.message ? `Message: "${sms.message}"` : 'Direct SMS',
      sms,
      url: `sms:${sms.number}${sms.message ? `?body=${encodeURIComponent(sms.message)}` : ''}`
    };
  }

  // 10. Geolocation (geo:lat,lng or Google Maps link)
  if (text.startsWith('geo:') || text.includes('maps.google.com') || text.includes('google.com/maps') || text.includes('openstreetmap.org')) {
    const geo = parseGeoString(text);
    return {
      category: 'geo',
      raw: text,
      title: geo ? `Location (${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)})` : 'Map Location',
      description: 'Geographical Coordinates / Map Link',
      geo: geo || undefined,
      url: geo ? `https://www.google.com/maps/search/?api=1&query=${geo.latitude},${geo.longitude}` : (text.startsWith('http') ? text : `https://${text}`)
    };
  }

  // 11. UPI Payment (upi://pay?...)
  if (text.startsWith('upi://')) {
    const upi = parseUpiString(text);
    return {
      category: 'upi',
      raw: text,
      title: upi.pn ? `UPI: ${upi.pn}` : `UPI: ${upi.pa || 'Payment Request'}`,
      description: upi.am ? `Amount: ₹${upi.am} ${upi.cu || 'INR'}` : 'Instant UPI Payment Link',
      upi,
      url: text
    };
  }

  // 12. URLs (http://, https://, or domain-like string)
  if (text.startsWith('http://') || text.startsWith('https://') || /^(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?$/.test(text)) {
    const fullUrl = text.startsWith('http') ? text : `https://${text}`;
    let domain = '';
    try {
      domain = new URL(fullUrl).hostname;
    } catch {
      domain = text;
    }
    return {
      category: 'url',
      raw: text,
      title: domain || fullUrl,
      description: fullUrl,
      url: fullUrl
    };
  }

  // 13. ISBN Book Barcode (EAN-13 starting with 978 or 979)
  if (format === 'EAN_13' && (text.startsWith('978') || text.startsWith('979')) && text.length === 13) {
    const checksum = validateGs1Checksum(text, 'EAN_13');
    return {
      category: 'isbn',
      raw: text,
      title: `ISBN Book: ${text}`,
      description: checksum.isValid ? 'Valid GS1 Book ISBN' : 'ISBN (Checksum Error)',
      isbn: text,
      productCode: text,
      checksum
    };
  }

  // 14. 1D Barcode Product Numbers (EAN-13, EAN-8, UPC-A, UPC-E, ITF, Code 128)
  const isProductBarcode = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'ITF', 'CODE_128', 'CODE_39'].includes(format);
  if (isProductBarcode && /^[0-9A-Z-]{4,20}$/.test(text)) {
    const checksum = validateGs1Checksum(text, format);
    return {
      category: 'product',
      raw: text,
      title: `Product: ${text}`,
      description: `Format: ${format.replace('_', '-')}${checksum.hasChecksum ? (checksum.isValid ? ' • Checksum Valid' : ' • Checksum Mismatch') : ''}`,
      productCode: text,
      checksum
    };
  }

  // 15. Default Plain Text
  return {
    category: 'text',
    raw: text,
    title: text.length > 45 ? `${text.slice(0, 42)}...` : text,
    description: `Format: ${format.replace('_', '-')}`
  };
}

/**
 * GS1 Modulus 10 Checksum Algorithm for EAN-13, EAN-8, UPC-A
 */
export function validateGs1Checksum(code: string, format: BarcodeFormatType): ChecksumValidation {
  const digits = code.replace(/\D/g, '');
  if (format === 'EAN_13' && digits.length === 13) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(digits[i], 10);
      sum += i % 2 === 0 ? digit * 1 : digit * 3;
    }
    const expected = (10 - (sum % 10)) % 10;
    const actual = parseInt(digits[12], 10);
    return {
      hasChecksum: true,
      isValid: expected === actual,
      expectedDigit: expected.toString(),
      actualDigit: actual.toString()
    };
  }

  if (format === 'UPC_A' && digits.length === 12) {
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(digits[i], 10);
      sum += i % 2 === 0 ? digit * 3 : digit * 1;
    }
    const expected = (10 - (sum % 10)) % 10;
    const actual = parseInt(digits[11], 10);
    return {
      hasChecksum: true,
      isValid: expected === actual,
      expectedDigit: expected.toString(),
      actualDigit: actual.toString()
    };
  }

  if (format === 'EAN_8' && digits.length === 8) {
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(digits[i], 10);
      sum += i % 2 === 0 ? digit * 3 : digit * 1;
    }
    const expected = (10 - (sum % 10)) % 10;
    const actual = parseInt(digits[7], 10);
    return {
      hasChecksum: true,
      isValid: expected === actual,
      expectedDigit: expected.toString(),
      actualDigit: actual.toString()
    };
  }

  return { hasChecksum: false, isValid: true };
}

function parseTotpUri(uri: string): TotpData {
  try {
    const url = new URL(uri);
    const label = decodeURIComponent(url.pathname.replace(/^\/\/?/, ''));
    let issuer = url.searchParams.get('issuer') || '';
    let account = label;

    if (label.includes(':')) {
      const parts = label.split(':');
      if (!issuer) issuer = parts[0].trim();
      account = parts.slice(1).join(':').trim();
    }

    return {
      issuer,
      account,
      secret: url.searchParams.get('secret') || '',
      algorithm: url.searchParams.get('algorithm') || 'SHA1',
      digits: parseInt(url.searchParams.get('digits') || '6', 10),
      period: parseInt(url.searchParams.get('period') || '30', 10)
    };
  } catch {
    return { secret: '' };
  }
}

function parseCalendarEvent(str: string): CalendarEventData {
  const result: CalendarEventData = { title: 'Calendar Event', rawIcs: str };
  const lines = str.split(/\r?\n/);

  for (const line of lines) {
    const [header, ...vals] = line.split(':');
    const val = vals.join(':').trim();
    const key = header.toUpperCase();

    if (key === 'SUMMARY') result.title = val;
    else if (key === 'DESCRIPTION') result.description = val;
    else if (key === 'LOCATION') result.location = val;
    else if (key.startsWith('DTSTART')) {
      result.startTime = parseIcsDate(val);
    } else if (key.startsWith('DTEND')) {
      result.endTime = parseIcsDate(val);
    }
  }

  return result;
}

function parseIcsDate(val: string): Date | undefined {
  // Format: 20260824T183000Z or 20260824
  try {
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 8) {
      const year = parseInt(clean.slice(0, 4), 10);
      const month = parseInt(clean.slice(4, 6), 10) - 1;
      const day = parseInt(clean.slice(6, 8), 10);
      const hour = clean.length >= 12 ? parseInt(clean.slice(8, 10), 10) : 0;
      const minute = clean.length >= 12 ? parseInt(clean.slice(10, 12), 10) : 0;
      const second = clean.length >= 14 ? parseInt(clean.slice(12, 14), 10) : 0;
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
  } catch {
    // Ignore date parse error
  }
  return undefined;
}

function parseCryptoAddress(text: string): CryptoData | null {
  // Bitcoin (Legacy 1..., P2SH 3..., Bech32 bc1...)
  if (text.startsWith('bitcoin:') || /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})$/i.test(text)) {
    const clean = text.replace(/^bitcoin:/i, '');
    const [address, query] = clean.split('?');
    const params = new URLSearchParams(query || '');
    return {
      currency: 'BTC',
      address,
      amount: params.get('amount') || undefined,
      label: params.get('label') || undefined,
      explorerUrl: `https://www.blockchain.com/explorer/addresses/btc/${address}`
    };
  }

  // Ethereum (0x...)
  if (text.startsWith('ethereum:') || /^0x[a-fA-F0-9]{40}$/.test(text)) {
    const address = text.replace(/^ethereum:/i, '').split('?')[0];
    return {
      currency: 'ETH',
      address,
      explorerUrl: `https://etherscan.io/address/${address}`
    };
  }

  // Solana (Base58 32-44 characters)
  if (text.startsWith('solana:') || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text) && text.length >= 32 && text.length <= 44 && !text.includes('http')) {
    const address = text.replace(/^solana:/i, '').split('?')[0];
    return {
      currency: 'SOL',
      address,
      explorerUrl: `https://solscan.io/account/${address}`
    };
  }

  return null;
}

function parseEpcPayment(text: string): EpcPaymentData | null {
  try {
    const lines = text.split(/\r?\n/);
    if (lines[0] === 'BCD' && lines.length >= 7) {
      return {
        bic: lines[4] || undefined,
        beneficiaryName: lines[5] || 'Beneficiary',
        iban: lines[6] || '',
        amount: lines[7] ? lines[7].replace(/^[A-Z]{3}/, '') : undefined,
        currency: lines[7] ? lines[7].slice(0, 3) : 'EUR',
        purpose: lines[9] || undefined,
        reference: lines[10] || lines[11] || undefined
      };
    }
  } catch {
    // Ignore EPC parse error
  }
  return null;
}

function parseWifiString(str: string): WifiData {
  const clean = str.replace(/^WIFI:/i, '').replace(/;;$/, '');
  const tokens = clean.split(';');
  const result: WifiData = { ssid: '' };

  for (const token of tokens) {
    if (!token) continue;
    const [key, ...vals] = token.split(':');
    const val = vals.join(':');
    if (key === 'S' || key === 's') result.ssid = val;
    else if (key === 'P' || key === 'p') result.password = val;
    else if (key === 'T' || key === 't') result.encryption = val;
    else if (key === 'H' || key === 'h') result.hidden = val.toLowerCase() === 'true';
  }

  return result;
}

function parseContactString(str: string): VCardData {
  const result: VCardData = {};

  if (str.startsWith('MECARD:')) {
    const clean = str.replace(/^MECARD:/i, '').replace(/;;$/, '');
    const parts = clean.split(';');
    for (const part of parts) {
      if (!part) continue;
      const [key, ...vals] = part.split(':');
      const val = vals.join(':');
      if (key === 'N') result.fullName = val.replace(',', ' ');
      else if (key === 'TEL') result.phone = val;
      else if (key === 'EMAIL') result.email = val;
      else if (key === 'ADR') result.address = val;
      else if (key === 'ORG') result.organization = val;
      else if (key === 'URL') result.url = val;
    }
    return result;
  }

  const lines = str.split(/\r?\n/);
  for (const line of lines) {
    const [header, ...vals] = line.split(':');
    const val = vals.join(':').trim();
    const key = header.toUpperCase();

    if (key === 'FN') result.fullName = val;
    else if (key === 'N' && !result.fullName) {
      const names = val.split(';');
      result.lastName = names[0];
      result.firstName = names[1];
      result.fullName = `${names[1] || ''} ${names[0] || ''}`.trim();
    } else if (key.startsWith('TEL')) {
      if (key.includes('CELL') || key.includes('MOBILE')) result.mobile = val;
      else result.phone = val;
    } else if (key.startsWith('EMAIL')) result.email = val;
    else if (key.startsWith('ORG')) result.organization = val;
    else if (key.startsWith('TITLE')) result.title = val;
    else if (key.startsWith('ADR')) result.address = val.replace(/;/g, ' ').trim();
    else if (key.startsWith('URL')) result.url = val;
    else if (key.startsWith('NOTE')) result.note = val;
  }

  return result;
}

function parseEmailString(str: string): { email?: string; subject?: string; body?: string } {
  if (str.startsWith('MATMSG:')) {
    const clean = str.replace(/^MATMSG:/i, '').replace(/;;$/, '');
    const parts = clean.split(';');
    const res: { email?: string; subject?: string; body?: string } = {};
    for (const p of parts) {
      if (p.startsWith('TO:')) res.email = p.slice(3);
      if (p.startsWith('SUB:')) res.subject = p.slice(4);
      if (p.startsWith('BODY:')) res.body = p.slice(5);
    }
    return res;
  }

  if (str.startsWith('mailto:')) {
    const clean = str.replace(/^mailto:/i, '');
    const [email, query] = clean.split('?');
    const params = new URLSearchParams(query || '');
    return { email, subject: params.get('subject') || undefined, body: params.get('body') || undefined };
  }

  return { email: str };
}

function parseSmsString(str: string): { number: string; message?: string } {
  if (str.startsWith('SMSTO:')) {
    const parts = str.slice(6).split(':');
    return { number: parts[0] || '', message: parts.slice(1).join(':') };
  }

  const clean = str.replace(/^sms:/i, '');
  const [num, query] = clean.split('?');
  let message = '';
  if (query) {
    const params = new URLSearchParams(query);
    message = params.get('body') || '';
  }
  return { number: num, message };
}

function parseGeoString(str: string): GeoData | null {
  if (str.startsWith('geo:')) {
    const coords = str.slice(4).split('?')[0].split(',');
    const lat = parseFloat(coords[0]);
    const lng = parseFloat(coords[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  const match = str.match(/([+-]?\d+\.?\d*),\s*([+-]?\d+\.?\d*)/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
}

function parseUpiString(str: string): { pa?: string; pn?: string; am?: string; cu?: string; tn?: string } {
  try {
    const url = new URL(str);
    return {
      pa: url.searchParams.get('pa') || undefined,
      pn: url.searchParams.get('pn') || undefined,
      am: url.searchParams.get('am') || undefined,
      cu: url.searchParams.get('cu') || 'INR',
      tn: url.searchParams.get('tn') || undefined
    };
  } catch {
    return {};
  }
}
