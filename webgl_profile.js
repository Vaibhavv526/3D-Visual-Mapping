import puppeteer from 'puppeteer-core';

async function run() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=d3d11']
  });
  const page = await browser.newPage();
  
  await page.evaluateOnNewDocument(() => {
    window.webglStats = {
      bufferDataTime: 0,
      bufferDataCalls: 0,
      bufferSizeTotal: 0,
      compileShaderTime: 0,
      compileShaderCalls: 0,
      linkProgramTime: 0,
      linkProgramCalls: 0,
      useProgramTime: 0,
      drawCalls: 0,
      texImage2DTime: 0,
      texImage2DCalls: 0,
      frames: [],
      currentFrame: {
        bufferDataTime: 0, bufferDataCalls: 0, bufferSizeTotal: 0,
        compileShaderTime: 0, compileShaderCalls: 0,
        linkProgramTime: 0, linkProgramCalls: 0,
        useProgramTime: 0, drawCalls: 0,
        texImage2DTime: 0, texImage2DCalls: 0,
      },
      materials: new Set(),
      isTwinRendered: false
    };

    let frameCount = 0;
    
    function measureLoop() {
      if (window.webglStats.currentFrame.drawCalls > 0 || window.webglStats.currentFrame.compileShaderCalls > 0 || window.webglStats.currentFrame.bufferDataCalls > 0) {
        window.webglStats.frames.push({...window.webglStats.currentFrame});
      }
      window.webglStats.currentFrame = {
        bufferDataTime: 0, bufferDataCalls: 0, bufferSizeTotal: 0,
        compileShaderTime: 0, compileShaderCalls: 0,
        linkProgramTime: 0, linkProgramCalls: 0,
        useProgramTime: 0, drawCalls: 0,
        texImage2DTime: 0, texImage2DCalls: 0,
      };
      frameCount++;
      requestAnimationFrame(measureLoop);
    }
    requestAnimationFrame(measureLoop);

    function hookWebGL(proto) {
      if (!proto) return;
      const originalBufferData = proto.bufferData;
      proto.bufferData = function(...args) {
        const start = performance.now();
        originalBufferData.apply(this, args);
        const dur = performance.now() - start;
        window.webglStats.currentFrame.bufferDataTime += dur;
        window.webglStats.currentFrame.bufferDataCalls++;
        if (args[1] && args[1].byteLength) {
            window.webglStats.currentFrame.bufferSizeTotal += args[1].byteLength;
        } else if (typeof args[1] === 'number') {
            window.webglStats.currentFrame.bufferSizeTotal += args[1];
        }
      };

      const originalCompileShader = proto.compileShader;
      proto.compileShader = function(...args) {
        const start = performance.now();
        originalCompileShader.apply(this, args);
        window.webglStats.currentFrame.compileShaderTime += (performance.now() - start);
        window.webglStats.currentFrame.compileShaderCalls++;
      };

      const originalLinkProgram = proto.linkProgram;
      proto.linkProgram = function(...args) {
        const start = performance.now();
        originalLinkProgram.apply(this, args);
        window.webglStats.currentFrame.linkProgramTime += (performance.now() - start);
        window.webglStats.currentFrame.linkProgramCalls++;
      };

      const originalUseProgram = proto.useProgram;
      proto.useProgram = function(...args) {
        const start = performance.now();
        originalUseProgram.apply(this, args);
        window.webglStats.currentFrame.useProgramTime += (performance.now() - start);
      };

      const originalDrawArrays = proto.drawArrays;
      proto.drawArrays = function(...args) {
        window.webglStats.currentFrame.drawCalls++;
        originalDrawArrays.apply(this, args);
      };

      const originalDrawElements = proto.drawElements;
      proto.drawElements = function(...args) {
        window.webglStats.currentFrame.drawCalls++;
        originalDrawElements.apply(this, args);
      };

      const originalTexImage2D = proto.texImage2D;
      proto.texImage2D = function(...args) {
        const start = performance.now();
        originalTexImage2D.apply(this, args);
        window.webglStats.currentFrame.texImage2DTime += (performance.now() - start);
        window.webglStats.currentFrame.texImage2DCalls++;
      };
    }
    
    hookWebGL(window.WebGLRenderingContext?.prototype);
    hookWebGL(window.WebGL2RenderingContext?.prototype);
  });
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  console.log('Scrolling to trigger Twin...');
  for (let i = 0; i < 15; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
    await new Promise(r => setTimeout(r, 400));
  }
  
  await new Promise(r => setTimeout(r, 3000));
  
  const stats = await page.evaluate(() => window.webglStats.frames);
  
  console.log('WebGL Stats Frames Captured:', stats.length);
  
  let twinStartIdx = stats.findIndex(f => f.bufferDataTime > 5 || f.compileShaderCalls > 0);
  if (twinStartIdx === -1) twinStartIdx = 0;
  
  console.log('--- First Frame (Initialization) ---');
  console.log(JSON.stringify(stats[twinStartIdx], null, 2));
  
  if (stats[twinStartIdx + 1]) {
      console.log('--- Second Frame ---');
      console.log(JSON.stringify(stats[twinStartIdx + 1], null, 2));
  }
  
  const steadyFrames = stats.slice(-10);
  const avgDrawCalls = steadyFrames.reduce((acc, f) => acc + f.drawCalls, 0) / steadyFrames.length;
  console.log('--- Steady State ---');
  console.log('Average Steady State Draw Calls:', avgDrawCalls);
  
  await browser.close();
}
run().catch(console.error);
