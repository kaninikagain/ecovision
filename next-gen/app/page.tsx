'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnalyseResponse, RulesData, HealthResponse, StatsResponse, WasteCategory } from '@/lib/types';

export default function Home() {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  const [sampleMode, setSampleMode] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Result state
  const [result, setResult] = useState<AnalyseResponse | null>(null);
  const [isSampleResult, setIsSampleResult] = useState<boolean>(false);

  // API Health & Rules state
  const [apiReady, setApiReady] = useState<boolean>(false);
  const [apiStatusText, setApiStatusText] = useState<string>('Connecting to the API...');
  const [statsText, setStatsText] = useState<string>('Loading scan statistics...');
  const [rules, setRules] = useState<Record<string, any>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  // Canvas-based image compressor to optimize upload latency and prevent large payload lag
  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatusText('Please select an image file (JPEG, PNG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1024;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPreviewUrl(dataUrl);
          const b64 = dataUrl.split(',')[1];
          setImageBase64(b64);
          setStatusText('');
          setResult(null);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Refresh statistics
  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Stats request failed');
      const stats: StatsResponse = await res.json();
      const breakdown = Object.entries(stats.by_category || {})
        .map(([cat, count]) => `${cat}: ${count}`)
        .join(', ');

      setStatsText(
        `Scans: ${stats.total_scans}${breakdown ? ` (${breakdown})` : ''}${
          stats.note ? ` · ${stats.note}` : ''
        }`
      );
    } catch (err: any) {
      setStatsText(`Stats unavailable: ${err.message}`);
    }
  }, []);

  // Connect and verify API endpoints
  const connectApi = useCallback(async () => {
    setApiReady(false);
    setApiStatusText('Connecting to API endpoints...');

    try {
      const [healthRes, rulesRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/rules'),
      ]);

      if (!healthRes.ok || !rulesRes.ok) {
        throw new Error('API server returned error code');
      }

      const health: HealthResponse = await healthRes.json();
      const rulesData: RulesData = await rulesRes.json();

      if (rulesData && rulesData.categories) {
        setRules(rulesData.categories);
      }

      setApiReady(true);
      setApiStatusText(
        `Connected · ${health.provider} / ${health.model}${
          health.key_set ? '' : ' · (API key not configured)'
        }`
      );
    } catch (err: any) {
      setApiReady(false);
      setApiStatusText(`API unavailable: ${err.message}. Ensure backend is running.`);
    }

    await refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    connectApi();
  }, [connectApi]);

  // Main scan action
  const handleScan = async () => {
    if (!imageBase64) return;

    setIsScanning(true);
    setStatusText('Scanning item with AI model...');
    const t0 = performance.now();

    try {
      if (sampleMode) {
        // Sample demonstration mode with realistic delay
        await new Promise((r) => setTimeout(r, 1000));
        const sampleResult: AnalyseResponse = {
          item_name: 'Plastic drink bottle (PET)',
          category: 'recyclable',
          model_category: 'recyclable',
          bin_name: 'Recycling bin',
          guidance: 'Empty and rinse it, then put it in the campus recycling bin.',
          caution: 'Greasy or wet items may not qualify.',
          explanation: 'Clear polyethylene terephthalate container suitable for standard campus recycling.',
          uncertainty_flag: false,
          valid_json: true,
          model: 'demo-sample-mode',
          provider: 'sample',
          latency_ms: 1000,
        };
        setResult(sampleResult);
        setIsSampleResult(true);
      } else {
        const res = await fetch('/api/analyse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: imageBase64,
            mime_type: 'image/jpeg',
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.detail || 'Inference failed');
        }

        setResult(data);
        setIsSampleResult(false);
        await refreshStats();
      }

      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
      setStatusText(`Analysis complete in ${elapsed}s`);

      // Scroll result into view smoothly
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (err: any) {
      setStatusText(`Analysis failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setImageBase64(null);
    setPreviewUrl(null);
    setResult(null);
    setStatusText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isAnalyseDisabled =
    !imageBase64 || isScanning || (!sampleMode && !apiReady);

  const activeCategory: WasteCategory = result?.category || 'unsure';

  return (
    <>
      {/* HERO SECTION */}
      <header className="hero">
        <svg
          className="hero-leaves"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M30 170 C20 100, 70 40, 150 30 C160 110, 110 170, 30 170 Z"
            fill="currentColor"
          />
          <path
            d="M50 150 C60 110, 90 70, 140 45"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        <div className="hero-content">
          <div className="brand">
            <span className="brand-dot"></span>
            EcoVision Mini AI
          </div>
          <h1>Sort waste with AI. Instantly.</h1>
          <p>
            Hold any item up to your camera to classify it into recycling,
            organic, hazardous, or general waste on campus.
          </p>

          <div className="bins" aria-label="Campus waste categories">
            <div className="bin blue" title="Recyclable items">
              <span>Recycle</span>
            </div>
            <div className="bin green" title="Organic compost">
              <span>Organic</span>
            </div>
            <div className="bin grey" title="General landfill">
              <span>General</span>
            </div>
            <div className="bin red" title="Hazardous & E-waste">
              <span>E-Waste</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN APPLICATION CONTAINER */}
      <main>
        {/* SCANNER CARD */}
        <section className="card" aria-labelledby="scan-heading">
          <h2 id="scan-heading" className="card-title">
            Scan an item
          </h2>
          <p className="sub">Place one item on a plain background with good light.</p>

          <div
            className={`viewfinder ${isScanning ? 'scanning' : ''} ${
              isDragOver ? 'drag-over' : ''
            }`}
            id="vf"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              id="fileInput"
              accept="image/*"
              capture="environment"
              aria-label="Upload or take photo of waste item"
              onChange={handleFileChange}
            />

            {!previewUrl ? (
              <div className="vf-empty">
                <div className="vf-icon-wrap">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7ee08a"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <b>Tap to take or choose photo</b>
                <small>Use camera or drag & drop image here</small>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Uploaded waste preview"
                className="preview-img"
              />
            )}

            {/* Target Reticle Accents */}
            <span className="c tl"></span>
            <span className="c tr"></span>
            <span className="c bl"></span>
            <span className="c br"></span>

            {/* Glowing Laser Sweep */}
            <div className="scanline"></div>
          </div>

          <button
            id="analyseBtn"
            className="btn-primary"
            disabled={isAnalyseDisabled}
            onClick={handleScan}
          >
            {isScanning ? (
              <>
                <span className="status-spinner"></span>
                Analyzing with Gemini...
              </>
            ) : (
              'Check my item'
            )}
          </button>

          <div className="status-bar" role="status" aria-live="polite">
            {isScanning && <span className="status-spinner"></span>}
            {statusText}
          </div>
        </section>

        {/* CLASSIFICATION RESULT CARD */}
        {result && (
          <section
            ref={resultRef}
            className="card result-card"
            id="resultCard"
            aria-live="polite"
          >
            {isSampleResult && (
              <div className="sample-banner">
                SAMPLE RESULT: Demo preview, not a live AI inference
              </div>
            )}

            <div className={`tagband ${activeCategory}`}>
              <span className="hole"></span>
              <div>
                <small>Put it in</small>
                <h3>{result.bin_name}</h3>
              </div>
            </div>

            <div className="rbody">
              <dl>
                <div className="r-grid">
                  <dt>Detected Item</dt>
                  <dd>
                    <strong>{result.item_name}</strong>
                  </dd>
                </div>
                <div className="r-grid">
                  <dt>Why</dt>
                  <dd>{result.explanation}</dd>
                </div>
                <div className="r-grid">
                  <dt>Campus Rule</dt>
                  <dd>{result.guidance}</dd>
                </div>
              </dl>

              <div className="meta-chips">
                <span className="chip">Category: {result.category}</span>
                <span className="chip">Model: {result.model}</span>
                <span className="chip">Latency: {result.latency_ms}ms</span>
                {result.uncertainty_flag && (
                  <span className="chip" style={{ background: '#ffe49e', color: '#684500' }}>
                    Flagged: Uncertain
                  </span>
                )}
              </div>

              {result.caution && (
                <div className="notice warn">
                  <strong>Caution:</strong> {result.caution}
                </div>
              )}

              <div className="notice info">
                AI provides campus sorting guidance, not a 100% guarantee. Always follow
                labels on bins and ask waste station staff if unsure.
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={handleReset}
              >
                Scan another item
              </button>
            </div>
          </section>
        )}

        {/* BACKEND API & DIAGNOSTICS */}
        <details className="setup" open>
          <summary>Backend API & System Diagnostics</summary>
          <p className="sub" style={{ marginTop: '10px', marginBottom: '4px' }}>
            {apiStatusText}
          </p>
          <p className="sub" style={{ margin: '4px 0 10px' }}>
            {statsText}
          </p>
          <div className="api-links">
            <a href="/api/health" target="_blank" rel="noopener noreferrer">
              GET /api/health
            </a>
            <a href="/api/rules" target="_blank" rel="noopener noreferrer">
              GET /api/rules
            </a>
            <a href="/api/stats" target="_blank" rel="noopener noreferrer">
              GET /api/stats
            </a>
            <span>POST /api/analyse (Scanner endpoint)</span>
          </div>
          <button
            type="button"
            className="btn-refresh"
            onClick={connectApi}
          >
            Reconnect / Refresh stats
          </button>
        </details>

        {/* DEMO CONTROLS */}
        <details className="setup">
          <summary>Demo Options & Security</summary>
          <label className="chk">
            <input
              type="checkbox"
              checked={sampleMode}
              onChange={(e) => setSampleMode(e.target.checked)}
            />
            <span>
              <strong>Sample mode:</strong> Simulates instant offline classification for UI testing.
            </span>
          </label>
          <p className="sub" style={{ marginTop: '10px', marginBottom: '0' }}>
            Security Hardening: The Gemini API key is strictly maintained on the server
            side (in <code>.env.local</code>) and is never transmitted to the browser.
          </p>
        </details>

        <footer>
          EcoVision Mini AI &middot; Next.js 15 Native Edition &middot; Campus Sustainability
        </footer>
      </main>
    </>
  );
}
