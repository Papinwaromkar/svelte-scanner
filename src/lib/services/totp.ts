/**
 * 100% Client-Side TOTP (Time-Based One-Time Password) Generator (RFC 6238 / RFC 4226)
 * Uses native Web Crypto API (SubtleCrypto HMAC-SHA1) with zero external dependencies.
 */

function base32ToUint8Array(base32: string): Uint8Array {
  const cleanBase32 = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleanBase32.length; i++) {
    const val = alphabet.indexOf(cleanBase32[i]);
    if (val === -1) continue;

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

export async function generateTOTP(secret: string, period = 30, digits = 6): Promise<{ code: string; secondsRemaining: number }> {
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / period);
  const secondsRemaining = period - (epoch % period);

  try {
    const keyData = base32ToUint8Array(secret);
    if (keyData.length === 0) {
      return { code: '------', secondsRemaining };
    }

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setBigUint64(0, BigInt(timeStep), false);

    const signature = await crypto.subtle.sign('HMAC', key, timeBuffer);
    const hash = new Uint8Array(signature);

    const offset = hash[hash.length - 1] & 0xf;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, digits);
    const code = otp.toString().padStart(digits, '0');

    return { code, secondsRemaining };
  } catch (err) {
    console.error('TOTP generation error:', err);
    return { code: '------', secondsRemaining };
  }
}
