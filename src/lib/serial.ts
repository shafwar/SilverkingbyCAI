export function generateSerialCode(prefix = "SK"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

export function normalizeSerialCode(serial: string) {
  return serial.replace(/\s+/g, "").toUpperCase();
}
