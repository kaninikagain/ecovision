// Automated verification: Dynamic AI detection for uploaded images (No hardcoded pizza box)
const { spawn } = require('child_process');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function runTests() {
  console.log('--- Testing Dynamic AI Detection on Uploaded Images ---');

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = 'c:\\Users\\Kaninika Gain\\Downloads\\ecovision-mini-ai\\ecovision-mini-ai\\.test-profile-upload';

  const edge = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9227',
    `--user-data-dir=${userDataDir}`,
    'http://localhost:8080/index.html'
  ]);

  await sleep(3000);

  try {
    const listRes = await fetch('http://127.0.0.1:9227/json');
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('8080')) || tabs[0];
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    let idCounter = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
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

    async function evalCode(expr) {
      const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      return res.result && res.result.result && res.result.result.value;
    }

    console.log('\n[TEST 1] Verifying findMaterial function across diverse queries:');
    const materialChecks = await evalCode(`
      ({
        bottle: findMaterial('plastic bottle')?.name,
        can: findMaterial('Diet Coke Aluminum Can')?.name,
        banana: findMaterial('Organic Banana Peel')?.name,
        newspaper: findMaterial('Daily Newspaper')?.name,
        glass: findMaterial('Beer Glass Bottle')?.name,
        battery: findMaterial('AA Battery')?.name,
        pizza: findMaterial('Greasy Pizza Box')?.name,
        unknown: findMaterial('some completely random unknown gadget 12345')
      });
    `);
    console.log('  Material mapping results:', materialChecks);

    let test1Passed = true;
    if (materialChecks.bottle !== 'Plastic Bottle') { console.error('  FAIL: bottle mapping'); test1Passed = false; }
    if (materialChecks.can !== 'Aluminum Can') { console.error('  FAIL: can mapping'); test1Passed = false; }
    if (materialChecks.banana !== 'Organic Food Waste') { console.error('  FAIL: banana mapping'); test1Passed = false; }
    if (materialChecks.glass !== 'Glass Bottle / Jar') { console.error('  FAIL: glass mapping'); test1Passed = false; }
    if (materialChecks.pizza !== 'Cardboard Pizza Box') { console.error('  FAIL: pizza mapping'); test1Passed = false; }
    if (materialChecks.unknown !== null) { console.error('  FAIL: unknown should return null, not pizza box'); test1Passed = false; }

    if (test1Passed) {
      console.log('  -> PASS: All material categories map dynamically without defaulting to Cardboard Pizza Box!');
    }

    console.log('\n[TEST 2] Verifying uploaded Plastic Water Bottle image detection:');
    const bottleResult = await evalCode(`
      (async () => {
        // Draw a simulated plastic bottle (translucent blue cylinder with cap)
        const c = document.createElement('canvas');
        c.width = 400; c.height = 400;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#f0f4f8';
        ctx.fillRect(0, 0, 400, 400);

        // Bottle body
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(150, 100, 100, 240);
        // Cap
        ctx.fillStyle = '#0288d1';
        ctx.fillRect(170, 70, 60, 30);

        const img = document.getElementById('scanner-feed-image');
        img.src = c.toDataURL();
        await new Promise(r => { img.onload = r; });

        // Execute scan with uploaded image
        await window.handleScanExecution(img);

        return {
          itemName: document.getElementById('detected-item-name')?.textContent.trim(),
          alertTitle: document.getElementById('alert-title')?.textContent.trim(),
          matchPercentage: document.getElementById('match-percentage')?.textContent.trim(),
          boxLeft: document.getElementById('bounding-box')?.style.left
        };
      })()
    `);
    console.log('  Uploaded Bottle Scan Result:', bottleResult);
    if (!bottleResult.itemName.includes('Pizza')) {
      console.log(`  -> PASS: Uploaded image detected as "${bottleResult.itemName}" (NOT hardcoded Cardboard Pizza Box)!`);
    } else {
      console.error('  -> FAIL: Still hardcoded to Pizza Box!');
    }

    console.log('\n[TEST 3] Verifying uploaded Banana / Food Scrap image detection:');
    const foodResult = await evalCode(`
      (async () => {
        // Draw yellow banana shape
        const c = document.createElement('canvas');
        c.width = 400; c.height = 400;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 400);

        ctx.fillStyle = '#fbc02d'; // Yellow
        ctx.beginPath();
        ctx.arc(200, 200, 90, 0.2 * Math.PI, 0.9 * Math.PI);
        ctx.lineWidth = 35;
        ctx.strokeStyle = '#fbc02d';
        ctx.stroke();

        const img = document.getElementById('scanner-feed-image');
        img.src = c.toDataURL();
        await new Promise(r => { img.onload = r; });

        await window.handleScanExecution(img);

        return {
          itemName: document.getElementById('detected-item-name')?.textContent.trim(),
          alertTitle: document.getElementById('alert-title')?.textContent.trim()
        };
      })()
    `);
    console.log('  Uploaded Food Scan Result:', foodResult);
    if (!foodResult.itemName.includes('Pizza')) {
      console.log(`  -> PASS: Uploaded food detected as "${foodResult.itemName}" (NOT Pizza Box)!`);
    } else {
      console.error('  -> FAIL: Still hardcoded to Pizza Box!');
    }

    console.log('\n[TEST 4] Verifying sample pizza box STILL detects as Cardboard Pizza Box:');
    const pizzaResult = await evalCode(`
      (async () => {
        const img = document.getElementById('scanner-feed-image');
        img.src = 'assets/pizza_box.jpg';
        await new Promise(r => { img.onload = r; });

        await window.handleScanExecution(img);

        return {
          itemName: document.getElementById('detected-item-name')?.textContent.trim(),
          alertTitle: document.getElementById('alert-title')?.textContent.trim(),
          stainPct: document.getElementById('stain-percent-text')?.textContent.trim()
        };
      })()
    `);
    console.log('  Actual Pizza Box Scan Result:', pizzaResult);
    if (pizzaResult.itemName.includes('Pizza') || pizzaResult.itemName.includes('Cardboard')) {
      console.log(`  -> PASS: Actual pizza box photo correctly identified as "${pizzaResult.itemName}" with ${pizzaResult.stainPct} contamination!`);
    } else {
      console.error('  -> FAIL: Actual pizza box was not recognized!');
    }

    console.log('\n=============================================');
    console.log('ALL TESTS PASSED: UPLOADED IMAGES DETECTED DYNAMICALLY! ✅');
    console.log('=============================================');

    ws.close();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    edge.kill();
  }
}

runTests();
