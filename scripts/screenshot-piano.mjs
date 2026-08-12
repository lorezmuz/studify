import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const url = process.argv[2] || "http://localhost:3005/piani/T1N2P3UlJQ";
const outDir = path.join(process.cwd(), "data", "screenshots");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "piano-full.png");

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1.25,
});

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
// wait fonts/katex
await page.waitForTimeout(1500);

// scroll to force lazy layout
await page.evaluate(async () => {
  await new Promise((resolve) => {
    let total = 0;
    const step = 600;
    const timer = setInterval(() => {
      window.scrollBy(0, step);
      total += step;
      if (total >= document.body.scrollHeight) {
        clearInterval(timer);
        window.scrollTo(0, 0);
        resolve(null);
      }
    }, 50);
  });
});
await page.waitForTimeout(800);

await page.screenshot({ path: out, fullPage: true });
console.log("saved", out);

// sample text checks
const bodyText = await page.locator("article").innerText().catch(() => "");
const rawFrac = bodyText.includes("\\frac") || bodyText.includes("\\(");
const hasKatex = (await page.locator(".katex").count()) > 0;
console.log(
  JSON.stringify(
    {
      hasKatex,
      katexCount: await page.locator(".katex").count(),
      rawFracVisible: rawFrac,
      articleChars: bodyText.length,
      title: await page.title(),
    },
    null,
    2
  )
);

await browser.close();
