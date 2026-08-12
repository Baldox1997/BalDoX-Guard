const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

(async () => {
  const outDir = path.join("D:", "Projects", "fernandotanaka-dev", "smart-pc-manager", ".screenshots");
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--disable-gpu", "--no-sandbox", "--hide-scrollbars"]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
  await page.goto("http://localhost:1420/assistant", { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(outDir, "assistant.png"), fullPage: false });
  await page.goto("http://localhost:1420/", { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(outDir, "dashboard.png"), fullPage: false });
  await browser.close();
  console.log("DONE");
})();
