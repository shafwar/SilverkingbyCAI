export function generateSerialCode(prefix = "SK"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

export function normalizeSerialCode(serial: string) {
  return serial.replace(/\s+/g, "").toUpperCase();
}

/**
 * Generate sequential serial numbers with zero-padding
 * @param prefix - Serial prefix (e.g., "SKA")
 * @param startNumber - Starting number (default: 1)
 * @param quantity - Number of serials to generate
 * @param padding - Number of digits for padding (default: 6, e.g., 000001)
 * @returns Array of serial codes (e.g., ["SKA000001", "SKA000002", ..., "SKA000100"])
 */
export function generateSequentialSerials(
  prefix: string,
  quantity: number,
  startNumber: number = 1,
  padding: number = 6
): string[] {
  const normalizedPrefix = normalizeSerialCode(prefix);
  const serials: string[] = [];

  for (let i = 0; i < quantity; i++) {
    const number = startNumber + i;
    const paddedNumber = number.toString().padStart(padding, "0");
    serials.push(`${normalizedPrefix}${paddedNumber}`);
  }

  return serials;
}

/**
 * Extract the numeric part from a serial code
 * @param serialCode - Serial code (e.g., "SKW0010")
 * @param prefix - Expected prefix (e.g., "SKW")
 * @returns The numeric part as number, or null if format doesn't match
 */
export function extractSerialNumber(serialCode: string, prefix: string): number | null {
  const normalizedPrefix = normalizeSerialCode(prefix);
  const normalizedSerial = normalizeSerialCode(serialCode);

  if (!normalizedSerial.startsWith(normalizedPrefix)) {
    return null;
  }

  const numericPart = normalizedSerial.slice(normalizedPrefix.length);
  const number = parseInt(numericPart, 10);

  if (isNaN(number)) {
    return null;
  }

  return number;
}

/**
 * Find the highest serial number for a given prefix
 * @param serials - Array of serial codes
 * @param prefix - Serial prefix
 * @returns The highest number found, or 0 if none found
 */
export function findHighestSerialNumber(serials: string[], prefix: string): number {
  let maxNumber = 0;

  for (const serial of serials) {
    const number = extractSerialNumber(serial, prefix);
    if (number !== null && number > maxNumber) {
      maxNumber = number;
    }
  }

  return maxNumber;
}