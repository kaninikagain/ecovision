// Automated Verification for Recyclable vs Non-Recyclable Handling
const { spawn } = require('child_process');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function runTests() {
  console.log('Testing Recyclable vs Non-Recyclable waste handling...');

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = 'c:\\Users\\Kaninika Gain\\Downloads\\ecovision-mini-ai\\ecovision-mini-ai\\.test-profile-waste';

  const edge = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9224',
    `--user-data-dir=${userDataDir}`,
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    'http://localhost:8080/frontend/index.html'
  ]);

  await sleep(3000);

  try {
    const listRes = await fetch('http://127.0.0.1:9224/json');
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

    async function evaluate(code) {
      const res = await send('Runtime.evaluate', {
        expression: code,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result?.result?.value;
    }

    // 1. Test Recyclable Item (Plastic Bottle)
    const tRecyclable = await evaluate(`
      (() => {
        const mockRecyclable = {
          item_name: "Plastic Water Bottle",
          category: "recyclable",
          is_recyclable: true,
          explanation: "Clear PET bottle suitable for campus recycling.",
          disposal_prep_steps: [
            "Empty all remaining water or beverage.",
            "Rinse bottle clean — no sugary residue.",
            "Remove plastic cap and crush bottle to save space."
          ],
          contamination_tip: "Bottles containing liquid contaminate paper in mixed recycling bins.",
          eco_swap: { product: "Insulated Stainless Steel Bottle", benefit: "Saves 150+ single-use plastic bottles per year." }
        };

        displayResult(mockRecyclable, "a1b2c3d4e5f67890123456789012345678901234567890123456789012345678", "1.2");

        return {
          bannerClass: $("wasteTypeBanner").className,
          bannerText: $("wasteTypeText").textContent,
          recyclableVisible: $("recyclableSection").style.display === "block",
          nonRecyclableHidden: $("nonRecyclableSection").style.display === "none",
          stepCount: $("prepStepsList").children.length,
          contaminationText: $("contaminationTip").textContent
        };
      })()
    `);

    const passRecyclable = (
      tRecyclable.bannerClass.includes('recyclable') &&
      tRecyclable.recyclableVisible &&
      tRecyclable.nonRecyclableHidden &&
      tRecyclable.stepCount === 3
    );
    console.log(`Test 1: Recyclable Disposal Pipeline: ${passRecyclable ? 'PASS' : 'FAIL'}`, tRecyclable);

    // Capture screenshot of recyclable result card
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    if (ss1.result?.data) {
      fs.writeFileSync('screenshot_waste_recyclable.png', Buffer.from(ss1.result.data, 'base64'));
    }

    // 2. Test Non-Recyclable Organic Item (Banana Peel)
    const tOrganic = await evaluate(`
      (() => {
        const mockOrganic = {
          item_name: "Banana Peel",
          category: "organic",
          is_recyclable: false,
          explanation: "Organic biodegradable fruit peel.",
          creative_alternatives: [
            { title: "Potassium Soil Feed", description: "Bury banana peel pieces directly around houseplant or rose garden soil for natural potassium." },
            { title: "Campus Compost Deposit", description: "Place in green organic waste bins to enrich university landscaping compost." },
            { title: "Shoe Polish Hack", description: "Rub the inside of a banana peel on leather shoes to shine them naturally." }
          ],
          eco_swap: { product: "Reusable Silicone Snack Pouch", benefit: "Prevents packaging waste when bringing fresh snacks to class." }
        };

        displayResult(mockOrganic, "f9e8d7c6b5a43210987654321098765432109876543210987654321098765432", "1.1");

        return {
          bannerClass: $("wasteTypeBanner").className,
          bannerText: $("wasteTypeText").textContent,
          recyclableHidden: $("recyclableSection").style.display === "none",
          nonRecyclableVisible: $("nonRecyclableSection").style.display === "block",
          cardsCount: $("creativeGrid").children.length,
          ecoSwapTitle: $("ecoSwapTitle").textContent,
          ecoSwapText: $("ecoSwapText").textContent
        };
      })()
    `);

    const passOrganic = (
      tOrganic.bannerClass.includes('non-recyclable') &&
      tOrganic.recyclableHidden &&
      tOrganic.nonRecyclableVisible &&
      tOrganic.cardsCount === 3
    );
    console.log(`Test 2: Non-Recyclable Organic Upcycling: ${passOrganic ? 'PASS' : 'FAIL'}`, tOrganic);

    // Capture screenshot of organic result card
    const ss2 = await send('Page.captureScreenshot', { format: 'png' });
    if (ss2.result?.data) {
      fs.writeFileSync('screenshot_waste_organic.png', Buffer.from(ss2.result.data, 'base64'));
    }

    // 3. Test Non-Recyclable General Packaging (Potato Chip Wrapper)
    const tGeneral = await evaluate(`
      (() => {
        const mockGeneral = {
          item_name: "Potato Chip Wrapper",
          category: "general",
          is_recyclable: false,
          explanation: "Multi-layer foil/plastic metallized film is non-recyclable.",
          creative_alternatives: [
            { title: "Eco-Brick Compact Filler", description: "Stuff clean wrappers tightly into plastic bottles to create high-density structural eco-bricks." },
            { title: "Sun-Reflective Seed Starter", description: "Rinse and invert shiny side out to reflect sunlight onto vegetable seedlings." }
          ],
          eco_swap: { product: "Bulk Packaged Snacks in Mason Jars", benefit: "Eliminates single-use foil laminate bags." }
        };

        displayResult(mockGeneral, "11223344556677889900aabbccddeeff00112233445566778899aabbccddeeff", "1.0");

        return {
          bannerClass: $("wasteTypeBanner").className,
          bannerText: $("wasteTypeText").textContent,
          cardsCount: $("creativeGrid").children.length,
          firstCardTitle: $("creativeGrid").children[0]?.querySelector('.creative-card-header')?.textContent?.trim()
        };
      })()
    `);

    const passGeneral = (
      tGeneral.bannerClass.includes('non-recyclable') &&
      tGeneral.cardsCount === 2 &&
      tGeneral.firstCardTitle.includes('Eco-Brick')
    );
    console.log(`Test 3: Non-Recyclable Packaging Repurposing: ${passGeneral ? 'PASS' : 'FAIL'}`, tGeneral);

    ws.close();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    edge.kill();
  }
}

runTests();
