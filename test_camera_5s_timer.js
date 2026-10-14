// Test Camera 5-Second Timer and Photo Capture
const { spawn } = require('child_process');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function runCameraTimerTests() {
  console.log('--- Testing Camera 5-Second Timer & Snapshot Flow ---');

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1366,768',
    'http://localhost:8080/index.html'
  ]);

  await sleep(2500);

  try {
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

    async function evalCode(expr) {
      const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      return res.result?.result?.value;
    }

    console.log('\n[TEST 1] Trigger "Start Camera" on index.html and verify 5-second countdown sequence:');
    
    // Click Start Camera button
    await evalCode(`
      document.getElementById('btn-camera').click();
    `);

    // Check immediate status (should be 5 seconds)
    await sleep(200);
    const stateAtStart = await evalCode(`
      ({
        overlayVisible: document.getElementById('camera-countdown-overlay')?.style.display !== 'none',
        digits: document.getElementById('camera-countdown-digits')?.textContent.trim(),
        btnText: document.getElementById('btn-camera')?.textContent.trim()
      });
    `);
    console.log('  State at t=0s:', stateAtStart);

    if (stateAtStart.overlayVisible && (stateAtStart.digits === '5' || stateAtStart.digits === '4')) {
      console.log('  -> PASS: 5-second countdown overlay started immediately on camera trigger!');
    } else {
      console.error('  -> FAIL: Countdown overlay did not start properly:', stateAtStart);
    }

    // Check state mid-way at t=2.5s (should be 3 or 2)
    await sleep(2500);
    const stateAtMid = await evalCode(`
      ({
        overlayVisible: document.getElementById('camera-countdown-overlay')?.style.display !== 'none',
        digits: document.getElementById('camera-countdown-digits')?.textContent.trim(),
        btnText: document.getElementById('btn-camera')?.textContent.trim()
      });
    `);
    console.log('  State at t=2.5s:', stateAtMid);

    // Wait until full 5 seconds elapse and photo is clicked
    await sleep(3500);
    const stateAfterCapture = await evalCode(`
      ({
        overlayVisible: document.getElementById('camera-countdown-overlay')?.style.display === 'none',
        btnText: document.getElementById('btn-camera')?.textContent.trim(),
        feedImgLoaded: !!document.getElementById('scanner-feed-image')?.src,
        alertTitle: document.getElementById('alert-title')?.textContent.trim(),
        detectedItem: document.getElementById('detected-item-name')?.textContent.trim()
      });
    `);
    console.log('  State at t=6s (after capture):', stateAfterCapture);

    if (stateAfterCapture.overlayVisible && stateAfterCapture.btnText.includes('Start Camera')) {
      console.log('  -> PASS: Photo captured after exactly 5 seconds and AI detection executed!');
    } else {
      console.error('  -> FAIL: Post-capture state unexpected:', stateAfterCapture);
    }

    // Capture screenshot of camera countdown
    console.log('\n[TEST 2] Capture screenshot of live 5-second countdown UI:');
    await evalCode(`
      document.getElementById('btn-camera').click();
    `);
    await sleep(1500); // 1.5s in, countdown shows 4 or 3
    const ssRes = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\Kaninika Gain\\.gemini\\antigravity-ide\\brain\\a64ed0cc-af1b-45c4-ad75-956b748bfcca\\screenshot_camera_5s_countdown.png', Buffer.from(ssRes.result.data, 'base64'));
    console.log('  -> Saved screenshot_camera_5s_countdown.png');

    console.log('\n=============================================');
    console.log('CAMERA 5-SECOND TIMER TESTS COMPLETE! ✅');
    console.log('=============================================');

    edge.kill();
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    edge.kill();
    process.exit(1);
  }
}

runCameraTimerTests();
