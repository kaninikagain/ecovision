// Automated CDP Test Suite for EcoVision
const { spawn } = require('child_process');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Starting Edge in headless remote debugging mode...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1600,900',
    'http://localhost:8080/index.html'
  ]);

  edge.stderr.on('data', d => {});
  await sleep(2500);

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('8080')) || tabs[0];
    if (!tab) throw new Error('No page tab found');

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
        console.log(`Saved screenshot: ${filename}`);
      }
    }

    console.log('\n--- TEST 1: Clear localStorage & check New User defaults ---');
    await evaluate(`
      localStorage.clear();
      window.location.reload();
    `);
    await sleep(2000);

    const userState = await evaluate(`
      ({
        headerLevel: document.getElementById('header-user-level')?.textContent.trim(),
        headerBadge: document.getElementById('header-user-badge')?.textContent.trim(),
        xp: document.getElementById('scoreboard-xp-amount')?.textContent.trim(),
        level: document.getElementById('scoreboard-level-tag')?.textContent.trim(),
        streak: document.getElementById('scoreboard-streak')?.textContent.trim(),
        progressSub: document.getElementById('scoreboard-progress-sub')?.textContent.trim(),
        barWidth: document.getElementById('scoreboard-progress-fill')?.style.width,
        co2: document.getElementById('val-co2')?.textContent.trim(),
        kwh: document.getElementById('val-kwh')?.textContent.trim()
      })
    `);
    console.log('Initial New User State:', userState);

    await screenshot('screenshot_step3.png');

    console.log('\n--- TEST 2: Trigger Sample Scan & Check Contamination + Model ---');
    await evaluate(`
      const img = document.getElementById('scanner-feed-image');
      if (window.handleScanExecution && img) {
        window.handleScanExecution(img);
      } else {
        document.getElementById('btn-sample').click();
      }
    `);
    // Wait for model inference & image load
    await sleep(4500);

    const scanState = await evaluate(`
      ({
        itemName: document.getElementById('detected-item-name')?.textContent.trim(),
        matchPct: document.getElementById('match-percentage')?.textContent.trim(),
        alertDisplay: document.getElementById('alert-card')?.style.display,
        alertTitle: document.getElementById('alert-title')?.textContent.trim(),
        stainPct: document.getElementById('stain-percent-text')?.textContent.trim(),
        co2: document.getElementById('val-co2')?.textContent.trim(),
        kwh: document.getElementById('val-kwh')?.textContent.trim(),
        phone: document.getElementById('val-smartphones')?.textContent.trim(),
        bulb: document.getElementById('val-bulb')?.textContent.trim(),
        xp: document.getElementById('scoreboard-xp-amount')?.textContent.trim(),
        streak: document.getElementById('scoreboard-streak')?.textContent.trim()
      })
    `);
    console.log('Post-Scan State:', scanState);

    await screenshot('screenshot_step3_scanned.png');

    console.log('\n--- TEST 3: Earn XP actions and test Level-up to Level 2 ---');
    // Click "✓ I recycled it"
    await evaluate(`document.getElementById('btn-recycled').click();`);
    await sleep(400);

    // Click "Mark as done" on upcycle card
    await evaluate(`document.querySelector('.btn-mark-done')?.click();`);
    await sleep(400);

    // Click first Eco-Swap chip
    await evaluate(`document.querySelector('.swap-chip')?.click();`);
    await sleep(400);

    // Add to wishlist
    await evaluate(`document.getElementById('btn-add-wishlist')?.click();`);
    await sleep(400);

    // Close modal
    await evaluate(`document.getElementById('btn-modal-close')?.click();`);
    await sleep(400);

    // Trigger voice query for +5 XP
    await evaluate(`window.handleVoiceQuery ? window.handleVoiceQuery('How do I prep this?') : null;`);
    await sleep(400);

    // Add 25 XP to reach 200 XP threshold for Level 2
    await evaluate(`
      if (window.stateManager) {
        window.stateManager.addXP(25, 'Daily Eco Quest');
      }
    `);
    await sleep(1000);

    const levelUpState = await evaluate(`
      ({
        xp: document.getElementById('scoreboard-xp-amount')?.textContent.trim(),
        level: document.getElementById('scoreboard-level-tag')?.textContent.trim(),
        headerLevel: document.getElementById('header-user-level')?.textContent.trim(),
        headerBadge: document.getElementById('header-user-badge')?.textContent.trim(),
        modalTitle: document.querySelector('.ecovision-modal-card .modal-title')?.textContent.trim(),
        modalBody: document.querySelector('.ecovision-modal-card .modal-body')?.textContent.trim()
      })
    `);
    console.log('Level-Up State:', levelUpState);

    await screenshot('screenshot_step3_levelup.png');

    // Close modal
    await evaluate(`document.getElementById('btn-modal-ok')?.click();`);
    await sleep(400);

    console.log('\n--- TEST 4: Step 4 Tabs (#insights, #about, and #map) ---');
    // Navigate to #insights
    await evaluate(`window.switchTab('#insights');`);
    await sleep(1500);
    await screenshot('screenshot_step4_insights.png');

    // Navigate to #about
    await evaluate(`window.switchTab('#about');`);
    await sleep(1500);
    await screenshot('screenshot_step4_about.png');

    // Navigate to #map
    await evaluate(`window.switchTab('#map');`);
    await sleep(1500);
    await screenshot('screenshot_step4_map.png');

    // Return to #live-scan
    await evaluate(`window.switchTab('#live-scan');`);
    await sleep(1000);

    console.log('\n--- TEST 5: Streak reset check (lastActiveDate 2 days ago) ---');
    const streakResetResult = await evaluate(`
      (async () => {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        window.stateManager.state.lastActiveDate = d.toISOString().slice(0, 10);
        window.stateManager.state.streak = 5;
        // next action
        window.stateManager.checkStreakBonus();
        return { streak: window.stateManager.state.streak, lastActiveDate: window.stateManager.state.lastActiveDate };
      })()
    `);
    console.log('Streak Reset Result (2 days ago):', streakResetResult);

    console.log('\n--- TEST 6: Persistence on reload ---');
    await evaluate(`window.location.reload();`);
    await sleep(2000);
    const persistedState = await evaluate(`
      ({
        xp: document.getElementById('scoreboard-xp-amount')?.textContent.trim(),
        level: document.getElementById('scoreboard-level-tag')?.textContent.trim(),
        headerLevel: document.getElementById('header-user-level')?.textContent.trim(),
        headerBadge: document.getElementById('header-user-badge')?.textContent.trim(),
        streak: document.getElementById('scoreboard-streak')?.textContent.trim()
      })
    `);
    console.log('Persisted State on Reload:', persistedState);

    console.log('\n--- TEST 7: Reset progress to Level 1 ---');
    await evaluate(`
      window.stateManager.reset();
      window.updateEcoSwapRecommendations();
    `);
    await sleep(500);
    const resetState = await evaluate(`
      ({
        xp: document.getElementById('scoreboard-xp-amount')?.textContent.trim(),
        level: document.getElementById('scoreboard-level-tag')?.textContent.trim(),
        headerLevel: document.getElementById('header-user-level')?.textContent.trim(),
        headerBadge: document.getElementById('header-user-badge')?.textContent.trim(),
        streak: document.getElementById('scoreboard-streak')?.textContent.trim()
      })
    `);
    console.log('State after Reset Progress:', resetState);

    ws.close();
  } catch (err) {
    console.error('Test Runner Error:', err);
  } finally {
    edge.kill();
  }
}

run();
