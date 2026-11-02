/**
 * Pure TypeScript Minimal QR Code Generator (Model 2, Byte Mode)
 * Generates valid SVG markup and Data URLs without external dependencies.
 */

// Simple Reed-Solomon polynomial math for QR generation
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = val;
    GF_EXP[i + 255] = val;
    GF_LOG[val] = i;
    val = (val << 1) ^ (val & 128 ? 0x11d : 0);
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function polyMul(p1: Uint8Array, p2: Uint8Array): Uint8Array {
  const res = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      res[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return res;
}

function getGeneratorPoly(degree: number): Uint8Array {
  let gen: Uint8Array<ArrayBufferLike> = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    gen = polyMul(gen, new Uint8Array([1, GF_EXP[i]]));
  }
  return gen as Uint8Array;
}

function calculateECC(data: Uint8Array, eccCount: number): Uint8Array {
  const gen = getGeneratorPoly(eccCount);
  const remainder = new Uint8Array(data.length + eccCount);
  remainder.set(data);

  for (let i = 0; i < data.length; i++) {
    const factor = remainder[i];
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        remainder[i + j] ^= gfMul(gen[j], factor);
      }
    }
  }
  return remainder.slice(data.length);
}

// QR Version 3 (29x29) Level L: 70 total codewords, 55 data, 15 ECC (supports up to ~53 bytes UTF-8)
// QR Version 4 (33x33) Level L: 100 total codewords, 80 data, 20 ECC (supports up to ~78 bytes UTF-8)
export function generateQRCodeMatrix(text: string): boolean[][] {
  const utf8Bytes = new TextEncoder().encode(text);
  const dataLen = utf8Bytes.length;

  // Choose smallest version that fits
  let version = 3;
  let totalDataBytes = 55;
  let eccBytes = 15;
  let size = 29;

  if (dataLen > 53) {
    version = 4;
    totalDataBytes = 80;
    eccBytes = 20;
    size = 33;
  }
  if (dataLen > 78) {
    version = 5;
    totalDataBytes = 108;
    eccBytes = 26;
    size = 37;
  }

  // 1. Build Bitstream (Byte Mode: 0100 + length + data + terminator)
  const bits: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(dataLen, 8); // 8-bit character count
  for (let i = 0; i < dataLen; i++) {
    pushBits(utf8Bytes[i], 8);
  }

  // Terminator (up to 4 zeroes)
  const remainingBits = totalDataBytes * 8 - bits.length;
  const termLen = Math.min(4, Math.max(0, remainingBits));
  pushBits(0, termLen);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad with alternating 0xEC and 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < totalDataBytes * 8) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to data codewords
  const dataCodewords = new Uint8Array(totalDataBytes);
  for (let i = 0; i < totalDataBytes; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    dataCodewords[i] = byte;
  }

  const eccCodewords = calculateECC(dataCodewords, eccBytes);
  const allCodewords = new Uint8Array(totalDataBytes + eccBytes);
  allCodewords.set(dataCodewords);
  allCodewords.set(eccCodewords, totalDataBytes);

  // 2. Initialize matrix
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );

  // Helper to place finder pattern
  function placeFinder(startX: number, startY: number) {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const px = startX + x;
        const py = startY + y;
        if (px >= 0 && px < size && py >= 0 && py < size) {
          if (
            (x >= 0 && x <= 6 && (y === 0 || y === 6)) ||
            (y >= 0 && y <= 6 && (x === 0 || x === 6)) ||
            (x >= 2 && x <= 4 && y >= 2 && y <= 4)
          ) {
            matrix[py][px] = true;
          } else {
            matrix[py][px] = false;
          }
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(size - 7, 0);
  placeFinder(0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  matrix[size - 8][8] = true;

  // Alignment pattern for v3 (22, 22), v4 (26, 26), v5 (30, 30)
  const alignPos = version === 3 ? 22 : version === 4 ? 26 : 30;
  for (let y = -2; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) {
      const isBlack = Math.max(Math.abs(x), Math.abs(y)) !== 1;
      matrix[alignPos + y][alignPos + x] = isBlack;
    }
  }

  // Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }

  // Format info mask (Level L, Mask 0: 111011111000100)
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  const formatPosTopLeft = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatPosTopLeft[i];
    matrix[r][c] = formatBits[i] === 1;
  }
  const formatPosSplit = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8],
    [size - 5, 8], [size - 6, 8], [size - 7, 8], [8, size - 8],
    [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4],
    [8, size - 3], [8, size - 2], [8, size - 1],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatPosSplit[i];
    matrix[r][c] = formatBits[i] === 1;
  }

  // 3. Place Data Codewords with Mask 0 ((row + col) % 2 === 0)
  let bitPointer = 0;
  const allBits: number[] = [];
  for (let i = 0; i < allCodewords.length; i++) {
    for (let b = 7; b >= 0; b--) {
      allBits.push((allCodewords[i] >> b) & 1);
    }
  }

  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // Skip vertical timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const c of [col, col - 1]) {
        if (matrix[row][c] === null) {
          const bit = bitPointer < allBits.length ? allBits[bitPointer++] : 0;
          // Apply mask 0: invert if (row + col) % 2 === 0
          const mask = (row + c) % 2 === 0;
          matrix[row][c] = (bit ^ (mask ? 1 : 0)) === 1;
        }
      }
    }
    upward = !upward;
  }

  return matrix.map((row) => row.map((cell) => cell ?? false));
}

export function generateQRCodeSVG(
  text: string,
  options: {
    size?: number;
    color?: string;
    bgColor?: string;
    quietZone?: number;
  } = {}
): string {
  const matrix = generateQRCodeMatrix(text);
  const matrixSize = matrix.length;
  const quietZone = options.quietZone ?? 4;
  const totalGrid = matrixSize + quietZone * 2;
  const renderSize = options.size ?? 240;
  const color = options.color ?? "#0f172a";
  const bgColor = options.bgColor ?? "#ffffff";

  let rects = "";
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c + quietZone}" y="${r + quietZone}" width="1" height="1" fill="${color}" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalGrid} ${totalGrid}" width="${renderSize}" height="${renderSize}" shape-rendering="crispEdges">
    <rect width="${totalGrid}" height="${totalGrid}" fill="${bgColor}" />
    ${rects}
  </svg>`.trim();
}

export function generateQRCodeDataURL(
  text: string,
  options?: Parameters<typeof generateQRCodeSVG>[1]
): string {
  const svg = generateQRCodeSVG(text, options);
  const base64 = typeof Buffer !== "undefined"
    ? Buffer.from(svg).toString("base64")
    : btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
}
