// Step 5 Comprehensive Acceptance Tests Runner for EcoVision
const { spawn } = require('child_process');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function runAcceptanceTests() {
  console.log('Starting Edge for Comprehensive Acceptance Tests (1 to 8)...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1600,900',
    'http://localhost:8080/index.html'
  ]);

  await sleep(2500);

  const testResults = [];

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('8080')) || tabs[0];
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    let idCounter = 1;
    const callbacks = new Map();
    const consoleErrors = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(msg.params?.exceptionDetails?.text || 'Exception');
      }
      if (msg.method === 'Log.entryAdded' && msg.params?.entry?.level === 'error') {
        consoleErrors.push(msg.params.entry.text);
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

    async function screenshot(filename) {
      const res = await send('Page.captureScreenshot', { format: 'png' });
      if (res.result?.data) {
        fs.writeFileSync(filename, Buffer.from(res.result.data, 'base64'));
      }
    }

    async function setViewport(width, height) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 600
      });
      await sleep(600);
    }

    // -------------------------------------------------------------
    // TEST 1: Clear localStorage -> reload -> check initial state
    // -------------------------------------------------------------
    await evaluate(`
      localStorage.clear();
      window.location.reload();
    `);
    await sleep(2200);

    const t1 = await evaluate(`
      ({
        headerLevel: document.getElementById('header-user-level')?.textContent.trim(),
        headerBadge: document.getElementById('header-user-badge')?.textContent.trim(),
        xp: document.getElementById('scoreboard-xp-amount')?.textContent.trim(),
        level: document.getElementById('scoreboard-level-tag')?.textContent.trim(),
        streak: document.getElementById('scoreboard-streak')?.textContent.trim(),
        barWidth: document.getElementById('scoreboard-progress-fill')?.style.width,
        badgesLocked: document.querySelectorAll('.badge-item.locked').length
      })
    `);

    const t1Pass = (
      t1.headerLevel.includes('Level 1') &&
      t1.headerBadge.includes('Eco Beginner') &&
      t1.xp === '0' &&
      t1.level === 'Level 1' &&
      t1.streak.includes('Start your streak') &&
      t1.barWidth === '0%' &&
      t1.badgesLocked === 3
    );
    testResults.push({ id: 1, name: 'Initial New User State (Level 1, 0 XP, streak 0, badges locked)', pass: t1Pass, details: t1 });

    // -------------------------------------------------------------
    // TEST 2: Load sample pizza-box photo -> real detection, stain, red card
    //         Then test clean item detection
    // -------------------------------------------------------------
    await evaluate(`
      const img = document.getElementById('scanner-feed-image');
      window.handleScanExecution(img);
    `);
    await sleep(4500);

    const t2a = await evaluate(`
      ({
        item: document.getElementById('detected-item-name')?.textContent.trim(),
        matchPct: document.getElementById('match-percentage')?.textContent.trim(),
        stainPct: document.getElementById('stain-percent-text')?.textContent.trim(),
        alertClass: document.getElementById('alert-card')?.className,
        alertTitle: document.getElementById('alert-title')?.textContent.trim(),
        recycledBtnEnabled: !document.getElementById('btn-recycled')?.disabled
      })
    `);

    // Now test a clean canvas / simulated clean item
    const t2b = await evaluate(`
      (async () => {
        // Create clean green / plastic image
        const c = document.createElement('canvas');
        c.width = 300; c.height = 300;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#3498DB'; // clean solid blue
        ctx.fillRect(0, 0, 300, 300);
        const cleanImg = new Image();
        cleanImg.src = c.toDataURL();
        await new Promise(r => { cleanImg.onload = r; });
        
        await window.handleScanExecution(cleanImg);
        return {
          alertClass: document.getElementById('alert-card')?.className,
          alertTitle: document.getElementById('alert-title')?.textContent.trim(),
          stainPct: document.getElementById('stain-percent-text')?.textContent.trim()
        };
      })()
    `);

    const t2Pass = (
      t2a.alertTitle.includes('Contamination Spotted') &&
      parseInt(t2a.stainPct) > 12 &&
      t2b.alertTitle.includes('Clean') &&
      parseInt(t2b.stainPct) < 12
    );
    testResults.push({ id: 2, name: 'Real detection & stain analysis (Contaminated vs Clean items)', pass: t2Pass, details: { soiled: t2a, clean: t2b } });

    // -------------------------------------------------------------
    // TEST 3: Impact numbers formulas check (re-scan pizza box)
    // -------------------------------------------------------------
    await evaluate(`
      (async () => {
        const img = document.getElementById('scanner-feed-image');
        await window.handleScanExecution(img);
      })()
    `);
    await sleep(2000);

    const t3 = await evaluate(`
      ({
        co2: document.getElementById('val-co2')?.textContent.trim(),
        kwh: document.getElementById('val-kwh')?.textContent.trim(),
        phone: document.getElementById('val-smartphones')?.textContent.trim(),
        bulb: document.getElementById('val-bulb')?.textContent.trim(),
        footnoteDisplay: document.getElementById('impact-footnote')?.style.display
      })
    `);

    const t3Pass = (
      t3.co2 === '-0.14' &&
      t3.kwh === '0.22' &&
      t3.phone.includes('18') &&
      t3.bulb.includes('22') &&
      t3.footnoteDisplay === 'block'
    );
    testResults.push({ id: 3, name: 'Impact Translator formulas (CO₂e, kWh, smartphones, LED hours, 60% reduction)', pass: t3Pass, details: t3 });

    // -------------------------------------------------------------
    // TEST 4: Real map tiles, distance callout, km/mi toggle, quick nav
    // -------------------------------------------------------------
    const t4 = await evaluate(`
      (() => {
        const calloutText = document.getElementById('callout-sub')?.textContent.trim();
        const initialUnit = document.getElementById('btn-unit-toggle')?.textContent.trim();
        const initialNavUrl = document.getElementById('btn-quick-nav')?.href;

        // Click toggle to km
        document.getElementById('btn-unit-toggle')?.click();
        const switchedUnit = document.getElementById('btn-unit-toggle')?.textContent.trim();
        const switchedCallout = document.getElementById('callout-sub')?.textContent.trim();

        // Switch back to mi
        document.getElementById('btn-unit-toggle')?.click();

        return {
          calloutText,
          initialUnit,
          switchedUnit,
          switchedCallout,
          initialNavUrl,
          hasTiles: !!document.querySelector('.leaflet-tile-pane')
        };
      })()
    `);

    const t4Pass = (
      t4.hasTiles &&
      t4.calloutText.includes('away') &&
      (t4.initialNavUrl.includes('google.com/maps') || t4.initialNavUrl.includes('maps.google.com')) &&
      t4.switchedUnit !== t4.initialUnit
    );
    testResults.push({ id: 4, name: 'Map tiles, Haversine distance callout, unit toggle & quick nav', pass: t4Pass, details: t4 });

    // -------------------------------------------------------------
    // TEST 5: First scan (+100 XP), recycled (+25 XP), Level 2 threshold (200 XP)
    // -------------------------------------------------------------
    // Clear and do fresh scan for clean XP progression test
    await evaluate(`
      (async () => {
        window.stateManager.reset();
        const img = document.getElementById('scanner-feed-image');
        await window.handleScanExecution(img);
      })()
    `);
    await sleep(2000);

    const xpAfterScan = await evaluate(`window.stateManager.state.xp`);
    const streakAfterScan = await evaluate(`window.stateManager.state.streak`);

    // Click "✓ I recycled it"
    await evaluate(`document.getElementById('btn-recycled').click();`);
    const xpAfterRecycle = await evaluate(`window.stateManager.state.xp`);

    // Add remaining XP to reach 200 XP
    const toAdd = 200 - xpAfterRecycle;
    await evaluate(`window.stateManager.addXP(${toAdd}, 'Daily Quest Completion');`);
    await sleep(800);

    const level2State = await evaluate(`
      ({
        xp: window.stateManager.state.xp,
        level: window.stateManager.state.level,
        headerLevel: document.getElementById('header-user-level')?.textContent.trim(),
        headerBadge: document.getElementById('header-user-badge')?.textContent.trim(),
        modalOpen: !!document.querySelector('.ecovision-modal-overlay')
      })
    `);

    const t5Pass = (
      xpAfterScan === 100 &&
      streakAfterScan === 1 &&
      xpAfterRecycle === 125 &&
      level2State.level === 2 &&
      level2State.headerLevel.includes('Level 2') &&
      level2State.headerBadge.includes('Eco Sprout') &&
      level2State.modalOpen
    );
    testResults.push({ id: 5, name: 'XP progression (First scan +100, recycled +25, Level 2 modal & title)', pass: t5Pass, details: { xpAfterScan, streakAfterScan, xpAfterRecycle, level2State } });

    // Close modal
    await evaluate(`document.getElementById('btn-modal-ok')?.click();`);
    await sleep(300);

    // -------------------------------------------------------------
    // TEST 6: Persistence on reload, streak reset (2 days ago), reset progress
    // -------------------------------------------------------------
    await evaluate(`window.location.reload();`);
    await sleep(2000);
    const persistedState = await evaluate(`
      ({
        xp: window.stateManager.state.xp,
        level: window.stateManager.state.level,
        streak: window.stateManager.state.streak
      })
    `);

    // Set lastActiveDate to two days ago
    const streakResetResult = await evaluate(`
      (() => {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        window.stateManager.state.lastActiveDate = d.toISOString().slice(0, 10);
        window.stateManager.state.streak = 5;
        // next action
        window.stateManager.checkStreakBonus();
        return window.stateManager.state.streak;
      })()
    `);

    // Reset progress
    await evaluate(`
      window.stateManager.reset();
      window.updateEcoSwapRecommendations();
    `);
    const afterResetState = await evaluate(`
      ({
        xp: window.stateManager.state.xp,
        level: window.stateManager.state.level,
        streak: window.stateManager.state.streak
      })
    `);

    const t6Pass = (
      persistedState.level === 2 &&
      persistedState.xp >= 200 &&
      streakResetResult === 1 &&
      afterResetState.level === 1 &&
      afterResetState.xp === 0 &&
      afterResetState.streak === 0
    );
    testResults.push({ id: 6, name: 'Persistence, streak reset after 2 days inactive, and reset progress', pass: t6Pass, details: { persistedState, streakResetResult, afterResetState } });

    // -------------------------------------------------------------
    // TEST 7: Viewport tests (1600x900, 1366x768, 390x844) & console errors
    // -------------------------------------------------------------
    // 1600x900
    await setViewport(1600, 900);
    const v1600Scroll = await evaluate(`document.body.scrollHeight <= 900 || document.documentElement.scrollHeight <= 900`);
    await screenshot('screenshot_viewport_1600x900.png');

    // 1366x768
    await setViewport(1366, 768);
    await screenshot('screenshot_viewport_1366x768.png');

    // 390x844 (Mobile)
    await setViewport(390, 844);
    await screenshot('screenshot_viewport_390x844.png');

    // Reset to 1600x900
    await setViewport(1600, 900);

    const t7Pass = (consoleErrors.length === 0);
    testResults.push({ id: 7, name: 'Responsive viewports & zero console errors', pass: t7Pass, details: { consoleErrors, v1600FitsNoScroll: v1600Scroll } });

    // -------------------------------------------------------------
    // TEST 8: Grep source for old hard-coded demo values
    // -------------------------------------------------------------
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const appJs = fs.readFileSync('app.js', 'utf8');

    const bannedPatterns = [
      '5,200',
      '5200',
      '12-day',
      '1.2 miles'
    ];

    const violations = [];
    bannedPatterns.forEach(pat => {
      if (indexHtml.includes(pat)) violations.push(`index.html contains "${pat}"`);
      if (appJs.includes(pat)) violations.push(`app.js contains "${pat}"`);
    });

    const t8Pass = violations.length === 0;
    testResults.push({ id: 8, name: 'Source grep check: zero legacy demo strings in codebase', pass: t8Pass, details: { violations } });

    console.log('\n======================================================');
    console.log('            ACCEPTANCE TESTS REPORT (1 TO 8)           ');
    console.log('======================================================');
    let allPassed = true;
    testResults.forEach(r => {
      console.log(`Test ${r.id}: [${r.pass ? 'PASS' : 'FAIL'}] — ${r.name}`);
      if (!r.pass) {
        allPassed = false;
        console.log('   Details:', r.details);
      }
    });
    console.log('======================================================');
    console.log(`OVERALL RESULT: ${allPassed ? 'ALL 8 TESTS PASSED!' : 'SOME TESTS FAILED'}`);

    ws.close();
  } catch (err) {
    console.error('Acceptance Test Execution Error:', err);
  } finally {
    edge.kill();
  }
}

runAcceptanceTests();
