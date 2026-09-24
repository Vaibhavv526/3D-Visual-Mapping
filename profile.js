import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ 
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=d3d11']
  });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Navigating to http://localhost:5173...');
  
  await page.exposeFunction('reportFPS', (fps) => {
    // console.log(`Current FPS: ${fps}`);
  });

  await page.evaluateOnNewDocument(() => {
    window.fpsData = [];
    let lastFrameTime = performance.now();
    let frameCount = 0;
    
    function measureLoop() {
      const now = performance.now();
      frameCount++;
      if (now - lastFrameTime >= 1000) {
        window.fpsData.push(frameCount);
        window.reportFPS(frameCount);
        frameCount = 0;
        lastFrameTime = now;
      }
      requestAnimationFrame(measureLoop);
    }
    requestAnimationFrame(measureLoop);
  });

  const startTime = Date.now();
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 60000 });
  const loadTime = Date.now() - startTime;
  console.log(`Page load time: ${loadTime}ms`);

  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Scrolling down (pipeline)...');
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('Scrolling to map...');
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8));
    await new Promise(r => setTimeout(r, 1000));
  }

  const inMap = await page.evaluate(() => !!document.querySelector('#map-container'));
  console.log(`Reached map container: ${inMap}`);

  if (inMap) {
    console.log('Interacting with digital twin...');
    const map = await page.$('#map-container');
    if (map) {
      const box = await map.boundingBox();
      if (box) {
        // Orbit
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();
        await new Promise(r => setTimeout(r, 500));
        // Zoom
        await page.mouse.wheel({ deltaY: -500 });
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  const fpsData = await page.evaluate(() => window.fpsData);
  const avgFps = fpsData.length ? fpsData.reduce((a, b) => a + b) / fpsData.length : 0;
  console.log(`Average FPS: ${avgFps.toFixed(2)}`);
  console.log(`FPS over time: ${fpsData.join(', ')}`);

  await browser.close();
}

run().catch(console.error);
