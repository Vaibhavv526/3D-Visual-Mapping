import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5175/', { waitUntil: 'networkidle0' });
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 1000));
  
  const measurements = await page.evaluate(() => {
    const getBounds = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
    };

    const canvasEl = document.querySelector('.nz-twin canvas');
    let canvasBounds = null;
    if (canvasEl) {
      const crect = canvasEl.getBoundingClientRect();
      canvasBounds = { width: crect.width, height: crect.height };
    }

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      mapSection: getBounds('.map-section'),
      mapHeader: getBounds('.map-header'),
      mapContainer: getBounds('#map-container'),
      nzTwin: getBounds('.nz-twin'),
      canvas: canvasBounds
    };
  });
  
  console.log(JSON.stringify(measurements, null, 2));
  await browser.close();
})();
