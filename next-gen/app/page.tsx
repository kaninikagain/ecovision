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

  // Cumulative student session stats from localStorage
  const [userStats, setUserStats] = useState<{
    totalScans: number;
    totalCo2Grams: number;
    streak: number;
  }>({ totalScans: 0, totalCo2Grams: 0, streak: 0 });

  // API Health & Rules state
  const [apiReady, setApiReady] = useState<boolean>(false);
  const [apiStatusText, setApiStatusText] = useState<string>('Connecting to the API...');
  const [statsText, setStatsText] = useState<string>('Loading scan statistics...');
  const [rules, setRules] = useState<Record<string, any>>({});
  const [activeQuickTest, setActiveQuickTest] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  // Load cumulative stats on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ecovision_user_stats');
      if (saved) {
        setUserStats(JSON.parse(saved));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const recordScanSuccess = useCallback((res: AnalyseResponse) => {
    setUserStats((prev) => {
      const updated = {
        totalScans: prev.totalScans + 1,
        totalCo2Grams: prev.totalCo2Grams + (res.eco_impact?.co2_saved_grams || 0),
        streak: prev.streak + 1,
      };
      try {
        localStorage.setItem('ecovision_user_stats', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Quick-Test Swag Preset Items for instant foolproof demo
  const QUICK_TEST_PRESETS = [
    {
      id: 'coffee',
      name: 'Starbucks Coffee Cup',
      emoji: '☕',
      tag: 'composite',
      tagLabel: 'Multi-Part',
      svgColor: '#78350f',
      result: {
        item_name: 'Takeaway Coffee Cup (Lid + Sleeve + Cup)',
        category: 'recyclable' as WasteCategory,
        model_category: 'recyclable',
        bin_name: 'Separate by component',
        guidance: 'Plastic lid and cardboard sleeve are recyclable; waxed cup belongs in general waste.',
        caution: 'Never toss unseparated coffee cups into paper bins—the inner polyethylene wax coating ruins paper pulping.',
        explanation: 'Multi-part composite container with separate recyclable and landfill components.',
        uncertainty_flag: false,
        valid_json: true,
        model: 'gemini-composite-breakdown',
        provider: 'gemini',
        latency_ms: 320,
        disassembly_steps: [
          { part: 'Plastic Sip Lid (#5 PP)', bin_name: 'Recycling bin', action: 'Pull off, rinse clean, and bin with rigid plastics' },
          { part: 'Cardboard Cup Sleeve', bin_name: 'Recycling bin', action: 'Slide off, flatten, and toss in paper/cardboard bin' },
          { part: 'Wax-Lined Paper Cup', bin_name: 'General waste', action: 'Discard in campus general landfill (wax liner is non-pulpable)' },
        ],
        eco_impact: {
          co2_saved_grams: 55,
          energy_saved_wh: 90,
          equivalency: 'Powers an LED study lamp for 9 hours',
        },
      },
    },
    {
      id: 'can',
      name: 'Crushed Soda Can',
      emoji: '🥫',
      tag: 'recycle',
      tagLabel: 'Recycle',
      svgColor: '#1d4ed8',
      result: {
        item_name: 'Crushed Beverage Can (Aluminum)',
        category: 'recyclable' as WasteCategory,
        model_category: 'recyclable',
        bin_name: 'Recycling bin',
        guidance: 'Empty liquid residue and place in campus metal recycling.',
        caution: 'Check that cans are empty to avoid attracting pests or dampening paper bins.',
        explanation: 'Infinitely recyclable aluminum with 95% energy savings over raw smelting.',
        uncertainty_flag: false,
        valid_json: true,
        model: 'gemini-vision',
        provider: 'gemini',
        latency_ms: 280,
        eco_impact: {
          co2_saved_grams: 170,
          energy_saved_wh: 350,
          equivalency: 'Powers a student laptop for 3.5 hours',
        },
      },
    },
    {
      id: 'banana',
      name: 'Banana Peel',
      emoji: '🍌',
      tag: 'organic',
      tagLabel: 'Organic',
      svgColor: '#15803d',
      result: {
        item_name: 'Organic Banana Peel',
        category: 'organic' as WasteCategory,
        model_category: 'organic',
        bin_name: 'Organic bin',
        guidance: 'Put it in the campus compost or organic food-waste bin.',
        caution: 'Remove any fruit brand stickers or plastic wrap before composting.',
        explanation: 'Fast-decomposing organic matter rich in potassium and nitrogen.',
        uncertainty_flag: false,
        valid_json: true,
        model: 'gemini-vision',
        provider: 'gemini',
        latency_ms: 240,
        eco_impact: {
          co2_saved_grams: 40,
          energy_saved_wh: 50,
          equivalency: 'Prevents 40g methane generation in local landfills',
        },
      },
    },
    {
      id: 'battery',
      name: 'AA Alkaline Battery',
      emoji: '🔋',
      tag: 'hazard',
      tagLabel: 'Hazardous',
      svgColor: '#b45309',
      result: {
        item_name: 'AA Cell Battery (E-Waste / Hazard)',
        category: 'hazardous' as WasteCategory,
        model_category: 'hazardous',
        bin_name: 'E-waste point',
        guidance: 'Drop off at the designated campus battery or e-waste recycling box.',
        caution: 'Tape over both positive and negative terminals to prevent short circuits.',
        explanation: 'Contains toxic electrolytes and heavy metals hazardous to ground ecology.',
        uncertainty_flag: false,
        valid_json: true,
        model: 'gemini-vision',
        provider: 'gemini',
        latency_ms: 290,
        eco_impact: {
          co2_saved_grams: 190,
          energy_saved_wh: 280,
          equivalency: 'Shields campus soil and groundwater from heavy metal leachate',
        },
      },
    },
    {
      id: 'chips',
      name: 'Shiny Chip Packet',
      emoji: '🍟',
      tag: 'general',
      tagLabel: 'Landfill',
      svgColor: '#475569',
      result: {
        item_name: 'Potato Chip Wrapper (Metalized Plastic Foil)',
        category: 'general' as WasteCategory,
        model_category: 'general',
        bin_name: 'General waste',
        guidance: 'Put it in the general waste bin.',
        caution: 'Consider bulk reusables next time to reduce single-use metallized packaging.',
        explanation: 'Multi-layer BOPP/aluminum laminate that cannot be recycled mechanically.',
        uncertainty_flag: false,
        valid_json: true,
        model: 'gemini-vision',
        provider: 'gemini',
        latency_ms: 260,
        eco_impact: {
          co2_saved_grams: 0,
          energy_saved_wh: 0,
          equivalency: 'Disposed cleanly without contaminating recycling bales',
        },
      },
    },
    {
      id: 'broken-mug',
      name: 'Broken Ceramic Mug',
      emoji: '☕',
      tag: 'general',
      tagLabel: 'Non-Recyclable',
      svgColor: '#78716c',
      result: {
        item_name: 'Broken Ceramic Mug (Crockery Shards)',
        category: 'general' as WasteCategory,
        model_category: 'general',
        bin_name: 'Non-recyclable general waste',
        guidance: 'Put it in the non-recyclable general waste bin. For broken items (broken ceramics, mugs, porcelain, or glass shards), wrap safely in newspaper or cardboard before binning to protect sanitation staff.',
        caution: 'Broken ceramics and mugs cannot be melted with container glass in recycling furnaces and must go to general waste.',
        explanation: 'Ceramics have high melting points that ruin glass recycling and broken shards pose a cut hazard.',
        uncertainty_flag: false,
        valid_json: true,
        model: 'gemini-3-flash-preview',
        provider: 'gemini',
        latency_ms: 310,
        eco_impact: {
          co2_saved_grams: 0,
          energy_saved_wh: 0,
          equivalency: 'Wrapped securely to protect campus sanitation staff from injuries',
        },
      },
    },
  ];

  const handleSelectQuickTest = (preset: typeof QUICK_TEST_PRESETS[0]) => {
    setActiveQuickTest(preset.id);
    
    // Generate an illustrative vector SVG preview
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#2a4c44"/>
          <stop offset="100%" stop-color="#0f2622"/>
        </radialGradient>
      </defs>
      <rect width="600" height="400" fill="url(#bg)"/>
      <circle cx="300" cy="180" r="85" fill="rgba(255,255,255,0.06)" stroke="#7ee08a" stroke-width="2" stroke-dasharray="6,4"/>
      <text x="300" y="195" font-size="80" text-anchor="middle" dominant-baseline="middle">${preset.emoji}</text>
      <text x="300" y="310" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">${preset.name}</text>
      <text x="300" y="340" font-family="system-ui, sans-serif" font-size="14" fill="#9cb8ad" text-anchor="middle">EcoVision Quick-Test Demo Sample</text>
    </svg>`;
    const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    setPreviewUrl(svgDataUrl);

    // Dummy base64 jpeg header so validate rules pass if submitted
    setImageBase64('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=');
    
    // Instantly populate result for high-speed demo day pitch
    setResult(preset.result);
    setIsSampleResult(true);
    setStatusText(`Instant scan: ${preset.name}`);
    recordScanSuccess(preset.result);

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  // Canvas-based image compressor to optimize upload latency and prevent large payload lag
  const processImageFile = useCallback((file: File) => {
    setActiveQuickTest(null);
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
          disassembly_steps: [
            { part: 'PET Bottle Body', bin_name: 'Recycling bin', action: 'Rinse and crush' },
            { part: 'HDPE Screw Cap', bin_name: 'Recycling bin', action: 'Screw cap back on bottle' },
          ],
          eco_impact: {
            co2_saved_grams: 65,
            energy_saved_wh: 120,
            equivalency: 'Powers a smartphone for 5.5 hours',
          },
        };
        setResult(sampleResult);
        setIsSampleResult(true);
        recordScanSuccess(sampleResult);
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
        recordScanSuccess(data);
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

          {/* HACKDAY FEATURE 1: QUICK-TEST DEMO SWAG CAROUSEL */}
          <div className="quick-test-section">
            <div className="quick-test-label">
              <span>🎯 Hackday Quick-Test Carousel</span>
              <span className="quick-test-badge">1-Click Live Demo</span>
            </div>
            <div className="quick-test-grid">
              {QUICK_TEST_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`quick-test-btn ${activeQuickTest === p.id ? 'active' : ''}`}
                  onClick={() => handleSelectQuickTest(p)}
                  title={`Instant test: ${p.name}`}
                >
                  <span className="quick-test-emoji">{p.emoji}</span>
                  <span className="quick-test-name">{p.name}</span>
                  <span className={`quick-test-tag ${p.tag}`}>{p.tagLabel}</span>
                </button>
              ))}
            </div>
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
                SAMPLE RESULT: Quick-Test / Demo preview
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

              {/* HACKDAY FEATURE 2: MULTI-PART DISASSEMBLY GUIDE */}
              {result.disassembly_steps && result.disassembly_steps.length > 0 && (
                <div className="disassembly-guide">
                  <div className="disassembly-title">
                    <span>⚠️ Multi-Part Composite Item Detected</span>
                  </div>
                  <p className="disassembly-desc">
                    Separate components before binning to prevent contaminating campus recycling streams:
                  </p>
                  <div className="disassembly-steps">
                    {result.disassembly_steps.map((step, idx) => {
                      const lowerBin = step.bin_name.toLowerCase();
                      const binColor =
                        lowerBin.includes('recycl') ? 'blue' :
                        lowerBin.includes('organ') ? 'green' :
                        lowerBin.includes('e-waste') || lowerBin.includes('hazard') ? 'red' :
                        lowerBin.includes('gener') ? 'grey' : 'amber';
                      return (
                        <div key={idx} className="disassembly-step-card">
                          <span className="disassembly-step-num">{idx + 1}</span>
                          <div className="disassembly-step-info">
                            <div className="disassembly-part-name">{step.part}</div>
                            <div className="disassembly-action">{step.action}</div>
                          </div>
                          <span className={`disassembly-bin-badge ${binColor}`}>
                            {step.bin_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* HACKDAY FEATURE 3: ECO-IMPACT & CARBON SAVED */}
              {result.eco_impact && (
                <div className="eco-impact-card">
                  <div className="eco-impact-header">
                    <div className="eco-impact-title">
                      <span>🌱 Environmental Savings</span>
                    </div>
                    <span className="eco-impact-score-pill">
                      +{result.eco_impact.co2_saved_grams}g CO₂ Diverted
                    </span>
                  </div>
                  <div className="eco-metrics-row">
                    <div className="eco-metric-tile">
                      <div className="eco-metric-val">+{result.eco_impact.co2_saved_grams}g</div>
                      <div className="eco-metric-sub">Carbon Diverted</div>
                    </div>
                    <div className="eco-metric-tile">
                      <div className="eco-metric-val">+{result.eco_impact.energy_saved_wh} Wh</div>
                      <div className="eco-metric-sub">Clean Energy Equivalent</div>
                    </div>
                  </div>
                  <div className="eco-equivalency-box">
                    <span>⚡</span>
                    <span>{result.eco_impact.equivalency}</span>
                  </div>
                </div>
              )}

              {/* CUMULATIVE STUDENT STREAK BANNER */}
              <div className="cumulative-streak-bar">
                <span>
                  🏅 Student Sorting Streak: <strong className="streak-counter">{userStats.streak} items</strong>
                </span>
                <span>
                  Total Saved: <strong style={{ color: 'var(--spruce)' }}>{userStats.totalCo2Grams}g CO₂</strong>
                </span>
              </div>

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
