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
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Scrolling down (pipeline)...');
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('Starting trace...');
  await page.tracing.start({ path: 'trace.json', screenshots: true });

  console.log('Scrolling to map...');
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8));
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('Stopping trace...');
  await page.tracing.stop();
  console.log('Trace saved to trace.json');
  await browser.close();
}

run().catch(console.error);
