import "server-only";

import sharp from "sharp";

function isIcoBuffer(buf: Buffer): boolean {
  return (
    buf.length >= 4 &&
    buf[0] === 0x00 &&
    buf[1] === 0x00 &&
    buf[2] === 0x01 &&
    buf[3] === 0x00
  );
}

export async function convertBufferToPngCover(
  input: Buffer,
  width: number,
  height: number,
  contentTypeHint?: string | null,
): Promise<Buffer | null> {
  try {
    const img = sharp(input, { failOn: "none" });
    const pipeline = img
      .resize(width, height, { fit: "cover" })
      .png({ compressionLevel: 9 });
    return await pipeline.toBuffer();
  } catch {
    // ignore and try ICO-specific decode if it looks like ICO
  }

  if (isIcoBuffer(input) || (contentTypeHint && /icon/.test(contentTypeHint))) {
    try {
      type IcoFrame = {
        width: number;
        height: number;
        buffer?: ArrayBuffer;
        data?: ArrayBuffer;
      };
      const mod = (await import("icojs")) as unknown as {
        parse: (buf: ArrayBuffer, outputType?: string) => Promise<IcoFrame[]>;
      };
      const arr = (input.buffer as ArrayBuffer).slice(
        input.byteOffset,
        input.byteOffset + input.byteLength,
      ) as ArrayBuffer;
      const frames = await mod.parse(arr as ArrayBuffer, "image/png");
      if (Array.isArray(frames) && frames.length > 0) {
        let chosen: IcoFrame = frames[0];
        chosen = frames.reduce((best: IcoFrame, cur: IcoFrame) => {
          const bw = Number(best?.width ?? 0);
          const bh = Number(best?.height ?? 0);
          const cw = Number(cur?.width ?? 0);
          const ch = Number(cur?.height ?? 0);
          // Manhattan distance to target rectangle for better rectangular fit
          const bDelta = Math.abs(bw - width) + Math.abs(bh - height);
          const cDelta = Math.abs(cw - width) + Math.abs(ch - height);
          return cDelta < bDelta ? cur : best;
        }, chosen);

        const arrBuf: ArrayBuffer | undefined = chosen.buffer ?? chosen.data;
        if (arrBuf) {
          const pngBuf = Buffer.from(arrBuf);
          return await sharp(pngBuf)
            .resize(width, height, { fit: "cover" })
            .png({ compressionLevel: 9 })
            .toBuffer();
        }
      }
    } catch {
      // Fall through to null
    }
  }

  return null;
}

export async function convertBufferToSquarePng(
  input: Buffer,
  size: number,
  contentTypeHint?: string | null,
): Promise<Buffer | null> {
  return convertBufferToPngCover(input, size, size, contentTypeHint);
}

export async function optimizePngCover(
  png: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  return await sharp(png)
    .resize(width, height, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
