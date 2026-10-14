const { spawn } = require('child_process');

async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function test() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1600,900',
    'http://localhost:8080/index.html'
  ]);

  await sleep(2500);
  try {
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('8080')) || tabs[0];
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    const errors = [];
    ws.onmessage = (ev) => {
      const d = JSON.parse(ev.data);
      if (d.method === 'Runtime.exceptionThrown') {
        errors.push(d.params?.exceptionDetails);
      }
      if (d.method === 'Log.entryAdded' && d.params?.entry?.level === 'error') {
        errors.push(d.params.entry);
      }
    };

    let id = 1;
    const send = (method, params = {}) => new Promise(r => {
      const msgId = id++;
      const handler = (ev) => {
        const d = JSON.parse(ev.data);
        if (d.id === msgId) {
          ws.removeEventListener('message', handler);
          r(d.result?.result?.value !== undefined ? d.result.result.value : d.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

    await new Promise(r => { ws.onopen = r; });
    await send('Runtime.enable');
    await send('Log.enable');

    // Reload page to capture script load errors
    await send('Page.enable');
    await send('Page.reload');
    await sleep(2000);

    const testEval = await send('Runtime.evaluate', {
      expression: `
        (() => {
          return {
            windowKeys: Object.keys(window).filter(k => k.includes('Eco') || k.includes('state') || k.includes('switch')),
            documentReady: document.readyState
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Test Eval:', testEval);
    console.log('Captured Errors:', JSON.stringify(errors, null, 2));

    ws.close();
  } catch (err) {
    console.error(err);
  } finally {
    edge.kill();
  }
}

test();
