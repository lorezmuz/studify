import { chromium } from "playwright";
import fs from "fs";

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage();
await page.goto("http://localhost:3005/piani/T1N2P3UlJQ?t=" + Date.now(), {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(2500);
const html = await page.locator(".study-md").innerHTML();
fs.writeFileSync("data/screenshots/study-md.html", html);
const p = html.indexOf("equilibrio");
console.log(html.slice(Math.max(0, p - 120), p + 200));
console.log("---");
const q = html.indexOf("quiete");
console.log(html.slice(Math.max(0, q - 80), q + 120));
console.log("---");
const f = html.indexOf("frac");
console.log(html.slice(Math.max(0, f - 100), f + 150));
await browser.close();
