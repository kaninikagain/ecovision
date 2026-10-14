// Automated Browser Verification for frontend/index.html
const { spawn } = require('child_process');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function runCameraTests() {
  console.log('Testing frontend/index.html live camera & SHA-256 duplicate guard...');

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = 'c:\\Users\\Kaninika Gain\\Downloads\\ecovision-mini-ai\\ecovision-mini-ai\\.test-profile';
  
  const edge = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9223',
    `--user-data-dir=${userDataDir}`,
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    'http://localhost:8080/frontend/index.html'
  ]);

  await sleep(3000);

  try {
    const listRes = await fetch('http://127.0.0.1:9223/json');
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('8080')) || tabs[0];
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    let idCounter = 1;
    const callbacks = new Map();
    const consoleLogs = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Log.entryAdded') {
        consoleLogs.push(msg.params.entry.text);
      }
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = idCounter++;
        callbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise(res => { ws.onopen = res; });
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Log.enable');

    async function evaluate(code) {
      const res = await send('Runtime.evaluate', {
        expression: code,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result?.result?.value;
    }

    // 1. Check DOM: file upload input is completely removed
    const hasFileInput = await evaluate(`!!document.querySelector('input[type="file"]')`);
    console.log(`Test 1: Upload photo input removed: ${!hasFileInput ? 'PASS' : 'FAIL'}`);

    // 2. Check camera elements exist
    const camElements = await evaluate(`({
      hasVideo: !!document.getElementById('cameraVideo'),
      hasSelect: !!document.getElementById('cameraSelect'),
      hasSwitchBtn: !!document.getElementById('switchCameraBtn'),
      hasScanBtn: !!document.getElementById('scanBtn'),
      hasCountdown: !!document.getElementById('countdownOverlay'),
      hasFlash: !!document.getElementById('cameraFlash'),
      hasDuplicateAlert: !!document.getElementById('duplicateAlert'),
      hasKeyInput: !!document.getElementById('geminiKeyInput')
    })`);
    console.log('Test 2: Camera elements exist:', camElements);

    // 3. Test SHA-256 cryptographic hash function
    const shaTest = await evaluate(`
      (async () => {
        const testBytes = new TextEncoder().encode("HelloEcoVision");
        const hashBuf = await crypto.subtle.digest("SHA-256", testBytes);
        const hex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
        return hex;
      })()
    `);
    // Expected SHA-256 of "HelloEcoVision"
    const crypto = require('crypto');
    const expectedHash = crypto.createHash('sha256').update('HelloEcoVision').digest('hex');
    const shaPassed = shaTest === expectedHash;
    console.log(`Test 3: Web Crypto SHA-256 produces valid hash: ${shaPassed ? 'PASS' : 'FAIL'} (${shaTest})`);

    // 4. Test 24-hour duplicate prevention logic
    const duplicateTest = await evaluate(`
      (() => {
        localStorage.removeItem('ecovision_scan_hashes_v1');
        const hash1 = 'abc123def4567890123456789012345678901234567890123456789012345678';
        
        // First check: should be null (not duplicate)
        const check1 = checkAndRecordDuplicate(hash1);

        // Immediate second check: should detect duplicate
        const check2 = checkAndRecordDuplicate(hash1);

        // Third check with different hash: should be null (not duplicate)
        const hash2 = 'fed987654321098765432109876543210987654321098765432109876543210';
        const check3 = checkAndRecordDuplicate(hash2);

        return {
          check1IsNull: check1 === null,
          check2IsDuplicate: !!check2 && !!check2.existing,
          check3IsNull: check3 === null
        };
      })()
    `);
    const dupPassed = duplicateTest.check1IsNull && duplicateTest.check2IsDuplicate && duplicateTest.check3IsNull;
    console.log(`Test 4: 24-hour duplicate prevention guard: ${dupPassed ? 'PASS' : 'FAIL'}`, duplicateTest);

    // 5. Test countdown trigger & state transition
    const countdownTest = await evaluate(`
      (() => {
        $("scanBtn").click();
        const overlayVisible = $("countdownOverlay").style.display === "flex";
        const countText = $("countdownNumber").textContent;
        return { overlayVisible, countText };
      })()
    `);
    console.log('Test 5: Countdown triggered on scan click:', countdownTest);

    // Take screenshot of the new live camera scanner interface
    const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
    if (screenshotRes.result?.data) {
      fs.writeFileSync('screenshot_frontend_camera.png', Buffer.from(screenshotRes.result.data, 'base64'));
      console.log('Captured screenshot_frontend_camera.png');
    }

    ws.close();
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    edge.kill();
  }
}

runCameraTests();
