import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1.25,
});
await page.goto("http://localhost:3005/piani/T1N2P3UlJQ?t=" + Date.now(), {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(3000);

const html = await page.locator(".study-md").innerHTML();
const body = await page.locator(".study-md").innerText();
const idx = body.indexOf("Premessa");

console.log(
  JSON.stringify(
    {
      strongCount: (html.match(/<strong>/g) || []).length,
      katexCount: (html.match(/class="katex"/g) || []).length,
      katexBlock: (html.match(/katex-block/g) || []).length,
      rawStars: (body.match(/\*\*/g) || []).length,
      pathLeak: /c0-5\.333|M377 20/.test(body),
      snippet: body.slice(idx, idx + 320),
    },
    null,
    2
  )
);

await page.evaluate(() => window.scrollTo(0, 1500));
await page.waitForTimeout(400);
await page.screenshot({ path: "data/screenshots/final-a.png" });
await page.evaluate(() => window.scrollTo(0, 2400));
await page.waitForTimeout(400);
await page.screenshot({ path: "data/screenshots/final-b.png" });
await page.screenshot({ path: "data/screenshots/piano-full.png", fullPage: true });

await browser.close();
