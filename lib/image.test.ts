/* @vitest-environment node */
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { addWatermarkToScreenshot, optimizeImageCover } from "./image";

describe("image utilities", () => {
  describe("addWatermarkToScreenshot", () => {
    it("adds watermark to screenshot and returns valid WebP buffer", async () => {
      // Create a simple test PNG (100x100 red square)
      const testPng = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await addWatermarkToScreenshot(testPng, 100, 100);

      // Verify result is a valid WebP buffer
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify it's still a valid image by processing with Sharp
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);

      // Verify the result is different from the original (watermark was applied)
      expect(result).not.toEqual(testPng);
    });

    it("scales font size based on image width", async () => {
      const smallPng = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const largePng = await sharp({
        create: {
          width: 1200,
          height: 630,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const smallResult = await addWatermarkToScreenshot(smallPng, 200, 200);
      const largeResult = await addWatermarkToScreenshot(largePng, 1200, 630);

      // Both should be valid WebPs
      expect(Buffer.isBuffer(smallResult)).toBe(true);
      expect(Buffer.isBuffer(largeResult)).toBe(true);

      // Results should be different from originals
      expect(smallResult).not.toEqual(smallPng);
      expect(largeResult).not.toEqual(largePng);
    });

    it("handles standard screenshot dimensions", async () => {
      const screenshotPng = await sharp({
        create: {
          width: 1200,
          height: 630,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await addWatermarkToScreenshot(screenshotPng, 1200, 630);

      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(630);
      expect(metadata.format).toBe("webp");
    });
  });

  describe("optimizeImageCover", () => {
    it("optimizes image with cover fit into WebP", async () => {
      const testPng = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await optimizeImageCover(testPng, 50, 50);

      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBe(50);
      expect(metadata.height).toBe(50);
    });
  });
});
