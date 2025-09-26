import sharp from "sharp";
import { addWatermarkToScreenshot } from "./lib/image.js";

async function testWatermark() {
  console.log("Creating test screenshot with watermark...");

  // Create a test screenshot-like image (simulates a webpage)
  const testImage = await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 40, g: 44, b: 52, alpha: 1 }, // Dark background like many sites
    },
  })
  .composite([
    {
      // Add some fake content
      input: Buffer.from(`
        <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
          <rect x="50" y="50" width="1100" height="100" fill="white" rx="8"/>
          <text x="100" y="120" font-family="Arial, sans-serif" font-size="36" fill="black">
            Sample Website Header
          </text>
          <rect x="50" y="200" width="500" height="150" fill="#2563eb" rx="8"/>
          <text x="70" y="240" font-family="Arial, sans-serif" font-size="18" fill="white">
            This is a test website content
          </text>
          <rect x="650" y="200" width="500" height="150" fill="#10b981" rx="8"/>
          <text x="670" y="240" font-family="Arial, sans-serif" font-size="18" fill="white">
            More content to simulate
          </text>
        </svg>
      `),
      blend: "over",
    }
  ])
  .png()
  .toBuffer();

  // Apply watermark
  const watermarkedImage = await addWatermarkToScreenshot(testImage, 1200, 630);
  
  // Save test images
  await sharp(testImage).png().toFile("/tmp/test-original.png");
  await sharp(watermarkedImage).png().toFile("/tmp/test-watermarked.png");
  
  console.log("Original image saved to: /tmp/test-original.png");
  console.log("Watermarked image saved to: /tmp/test-watermarked.png");
  
  // Compare file sizes
  const originalSize = testImage.length;
  const watermarkedSize = watermarkedImage.length;
  console.log(`Original size: ${originalSize} bytes`);
  console.log(`Watermarked size: ${watermarkedSize} bytes`);
  console.log(`Size difference: ${watermarkedSize - originalSize} bytes`);
}

testWatermark().catch(console.error);