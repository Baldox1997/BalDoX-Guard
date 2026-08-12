import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const outDir = path.join("D:", "Projects", "fernandotanaka-dev", "smart-pc-manager", ".screenshots");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--enable-webgl", "--use-gl=angle", "--no-sandbox", "--hide-scrollbars"]
});

for (const [name, url] of [["assistant", "http://localhost:1420/assistant"], ["dashboard", "http://localhost:1420/"]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => document.querySelector("canvas") !== null, { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
  await page.close();
  console.log(`saved ${name}`);
}

await browser.close();
console.log("DONE");
