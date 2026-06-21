// Capture a true mobile rendering of a site using puppeteer-core + installed Chrome.
// Usage: node scripts/capture-mobile.mjs <url> <out.png> [captureHeightCss=1500]
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [url, out, heightArg] = process.argv.slice(2);
const captureHeight = Number(heightArg) || 1500;

if (!url || !out) {
  console.error("usage: node scripts/capture-mobile.mjs <url> <out.png> [heightCss]");
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--disable-gpu"],
});

try {
  const page = await browser.newPage();
  // True iPhone emulation: mobile viewport, touch, DPR 3 → triggers responsive layout
  await page.emulate({
    viewport: {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      isLandscape: false,
    },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  });

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  // settle: fonts, lazy images, hero animations
  await new Promise((r) => setTimeout(r, 3000));

  await page.screenshot({
    path: out,
    clip: { x: 0, y: 0, width: 390, height: captureHeight },
  });
  console.log(`✓ saved ${out} (390x${captureHeight} css → 3x)`);
} catch (e) {
  console.error("✗", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
