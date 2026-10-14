const fs = require('fs');
const { spawn } = require('child_process');

async function capture() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProcess = spawn(edgePath, [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:8080/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const listRes = await fetch('http://127.0.0.1:9222/json');
  const targets = await listRes.json();
  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let id = 1;
  const callbacks = new Map();
  ws.onmessage = (event) => {
    const parsed = JSON.parse(event.data);
    if (callbacks.has(parsed.id)) {
      callbacks.get(parsed.id)(parsed);
    }
  };

      function send(method, params = {}) {
        return new Promise(resolve => {
          const callId = id++;
          callbacks.set(callId, resolve);
          ws.send(JSON.stringify({ id: callId, method, params }));
        });
      }

      await new Promise(r => ws.onopen = r);
      await send('Runtime.enable');
      await send('Page.enable');
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1366,
        height: 768,
        deviceScaleFactor: 1,
        mobile: false
      });

      // Simulate uploading a plastic bottle image by updating feedImage.src
      await send('Runtime.evaluate', {
        expression: `
          (async () => {
            const canvas = document.createElement('canvas');
            canvas.width = 400; canvas.height = 400;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#e8f4f8';
            ctx.fillRect(0, 0, 400, 400);

            // Draw a clear blue water bottle
            ctx.fillStyle = '#0288d1';
            ctx.fillRect(170, 40, 60, 40); // cap
            ctx.fillStyle = '#4fc3f7';
            ctx.beginPath();
            ctx.roundRect(140, 80, 120, 260, 20); // body
            ctx.fill();

            const feedImage = document.getElementById('scanner-feed-image');
            feedImage.src = canvas.toDataURL('image/jpeg');
            await new Promise(r => feedImage.onload = r);
            await window.handleScanExecution(feedImage);
          })()
        `,
        awaitPromise: true
      });

      await new Promise(r => setTimeout(r, 4500));

      const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
      const imgBuffer = Buffer.from(screenshotRes.result.data, 'base64');
      fs.writeFileSync('C:\\Users\\Kaninika Gain\\.gemini\\antigravity-ide\\brain\\a64ed0cc-af1b-45c4-ad75-956b748bfcca\\screenshot_uploaded_bottle_detection.png', imgBuffer);
      console.log('Saved screenshot_uploaded_bottle_detection.png');

      edgeProcess.kill();
      process.exit(0);
}

capture();
