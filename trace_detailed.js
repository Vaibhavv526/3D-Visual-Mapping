import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function run() {
  const browser = await puppeteer.launch({ 
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=d3d11']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Navigating...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 60000 });
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Starting detailed trace...');
  await page.tracing.start({ 
      path: 'trace_detailed.json',
      categories: [
          '-*', 
          'devtools.timeline', 
          'v8.execute', 
          'blink.user_timing',
          'disabled-by-default-devtools.timeline',
          'disabled-by-default-devtools.timeline.frame',
          'v8.compile',
          'blink.console',
          'disabled-by-default-v8.cpu_profiler',
          'gpu'
      ]
  });

  console.log('Triggering transition...');
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8));
    await new Promise(r => setTimeout(r, 200));
  }
  
  // wait for it to load
  await new Promise(r => setTimeout(r, 4000));

  console.log('Stopping trace...');
  await page.tracing.stop();
  await browser.close();
}

run().catch(console.error);
