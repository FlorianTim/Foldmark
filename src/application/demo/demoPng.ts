/**
 * A small PNG drawn without a canvas, so the demo image exists in the browser
 * and under Node alike and is byte-for-byte the same every time. The picture
 * is a two-tone gradient with a diagonal — enough to see that an image is an
 * image on the page, and small enough to keep in a backup without noticing.
 */

/** CRC-32 over a byte range, as PNG chunks require. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcInput = new Uint8Array(4 + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcInput));
  return out;
}

/** zlib-wrapped deflate through the platform's stream, which browsers and Node share. */
async function deflate(raw: Uint8Array): Promise<Uint8Array> {
  const body = new Response(raw).body;
  if (!body) throw new Error('no body stream');
  const stream = body.pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** An RGB PNG of the given size: a teal-to-sand gradient with a dark diagonal. */
export async function renderDemoPng(width: number, height: number): Promise<Blob> {
  const raw = new Uint8Array(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) {
    const row = y * (1 + width * 3);
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      const t = x / Math.max(1, width - 1);
      const onDiagonal = Math.abs(x / width - y / height) < 0.02;
      const offset = row + 1 + x * 3;
      raw[offset] = onDiagonal ? 0x17 : Math.round(0x17 + (0xe9 - 0x17) * t);
      raw[offset + 1] = onDiagonal ? 0x4a : Math.round(0x4a + (0xd8 - 0x4a) * t);
      raw[offset + 2] = onDiagonal ? 0x5b : Math.round(0x5b + (0xc0 - 0x5b) * t);
    }
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parts = [
    signature,
    chunk('IHDR', header),
    chunk('IDAT', await deflate(raw)),
    chunk('IEND', new Uint8Array(0)),
  ];
  return new Blob(parts, { type: 'image/png' });
}
