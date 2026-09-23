import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5175/', { waitUntil: 'networkidle0' });
  
  // Scroll to the end of the cinematic wrapper (8370px)
  await page.evaluate(() => {
    window.scrollTo(0, 8000);
  });
  await new Promise(r => setTimeout(r, 1000));
  
  const info = await page.evaluate(() => {
    const el = document.querySelector('.hero-and-pipeline-wrapper > div:first-child');
    const rect = el.getBoundingClientRect();
    const mapEl = document.querySelector('#map-container');
    const mapRect = mapEl ? mapEl.getBoundingClientRect() : null;
    return {
      elRect: { top: rect.top, bottom: rect.bottom, height: rect.height },
      mapRect: mapRect ? { top: mapRect.top, bottom: mapRect.bottom, height: mapRect.height } : null,
      innerHeight: window.innerHeight
    };
  });
  console.log('At 8000px scroll:', info);

  await page.evaluate(() => {
    window.scrollTo(0, 9000); // Fully past the wrapper
  });
  await new Promise(r => setTimeout(r, 1000));
  const info2 = await page.evaluate(() => {
    const el = document.querySelector('.hero-and-pipeline-wrapper > div:first-child');
    const rect = el.getBoundingClientRect();
    const mapEl = document.querySelector('#map-container');
    const mapRect = mapEl ? mapEl.getBoundingClientRect() : null;
    return {
      elRect: { top: rect.top, bottom: rect.bottom, height: rect.height },
      mapRect: mapRect ? { top: mapRect.top, bottom: mapRect.bottom, height: mapRect.height } : null,
      innerHeight: window.innerHeight
    };
  });
  console.log('At 9000px scroll:', info2);

  await browser.close();
})();
