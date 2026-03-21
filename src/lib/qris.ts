/**
 * QRIS (Quick Response Code Indonesian Standard) utility
 * Converts a static QRIS string to dynamic by embedding the transaction amount.
 * Based on EMV QR Code spec (EMVCO) and Bank Indonesia QRIS standard.
 */

function crc16ccitt(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      else crc = (crc << 1) & 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function makeQrisDynamic(staticQris: string, amount: number): string {
  const crcIndex = staticQris.lastIndexOf('6304');
  if (crcIndex === -1) throw new Error('Format QRIS tidak valid: CRC tidak ditemukan');

  // Strip CRC
  let qris = staticQris.slice(0, crcIndex);

  // Change initiation method: static (0211) → dynamic (0212)
  qris = qris.replace('010211', '010212');

  // Build amount tag (ID 54)
  const amountStr = Math.round(amount).toString();
  const amountTag = `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;

  // Insert amount before country code tag (5802ID) or merchant name tag (59)
  const insertPos = qris.indexOf('5802');
  if (insertPos !== -1) {
    qris = qris.slice(0, insertPos) + amountTag + qris.slice(insertPos);
  } else {
    qris += amountTag;
  }

  // Recalculate CRC
  qris += '6304';
  qris += crc16ccitt(qris);

  return qris;
}

export function validateQrisString(qris: string): boolean {
  if (!qris || !qris.startsWith('000201')) return false;
  const crcIndex = qris.lastIndexOf('6304');
  if (crcIndex === -1 || qris.length - crcIndex !== 8) return false;
  const data = qris.slice(0, crcIndex + 4);
  const expectedCrc = crc16ccitt(data);
  const actualCrc = qris.slice(crcIndex + 4).toUpperCase();
  return expectedCrc === actualCrc;
}
