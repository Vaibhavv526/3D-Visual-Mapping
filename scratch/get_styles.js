import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5175/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  const info = await page.evaluate(() => {
    const el = document.querySelector('.hero-and-pipeline-wrapper > div:first-child');
    return {
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: window.getComputedStyle(el).overflowY
    };
  });
  console.log(info);
  await browser.close();
})();
