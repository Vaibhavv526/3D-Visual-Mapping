import puppeteer from 'puppeteer-core';
async function run() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  console.log('Scrolling...');
  for (let i = 0; i < 15; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
    await new Promise(r => setTimeout(r, 400));
  }
  
  await new Promise(r => setTimeout(r, 6000));
  await browser.close();
}
run();