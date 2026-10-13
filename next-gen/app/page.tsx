'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnalyseResponse, WasteCategory } from '@/lib/types';

// Preset item type for interactive live demo
interface DemoPreset {
  id: string;
  name: string;
  emoji: string;
  tag: string;
  tagLabel: string;
  confidence: string;
  co2Saved: string;
  energyAvoided: string;
  phoneEquiv: string;
  bulbEquiv: string;
  contaminationAlert?: {
    title: string;
    description: string;
    isContaminated: boolean;
  };
  upcyclingSteps: Array<{ title: string; desc: string }>;
  ecoSwap: {
    title: string;
    description: string;
    tags: string[];
  };
  result: AnalyseResponse;
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'pizza-box',
    name: 'Cardboard Pizza Box',
    emoji: '🍕',
    tag: 'composite',
    tagLabel: '89% match',
    confidence: '89%',
    co2Saved: '-0.14 kg',
    energyAvoided: '0.22 kWh',
    phoneEquiv: 'Equivalent to fully charging 18 smartphones',
    bulbEquiv: 'Powering an LED bulb for 14 hours',
    contaminationAlert: {
      title: 'Contamination Spotted:',
      description: 'Food and grease found! Rip off the clean top half to recycle, discard the oily bottom in general/compost.',
      isContaminated: true,
    },
    upcyclingSteps: [
      { title: 'Soiled bottom half:', desc: 'Place in backyard compost pile or municipal organic bin.' },
      { title: 'Torn Cardboard:', desc: 'Use as weed barrier or moisture retainer in garden mulch.' },
      { title: 'Clean top half:', desc: 'Rip along fold line and place in clean paper/cardboard recycling.' },
    ],
    ecoSwap: {
      title: 'Eco-Swap Suggestion:',
      description: 'Reusable beeswax wraps / silicone baking mats',
      tags: ['Reusable beeswax', 'Baking mats', 'Silicone baking mats'],
    },
    result: {
      item_name: 'Cardboard Pizza Box (Grease Soiled)',
      category: 'general' as WasteCategory,
      model_category: 'general',
      bin_name: 'Separate by component',
      guidance: 'Tear off the clean lid for paper recycling; discard the greasy bottom half into compost or general waste.',
      caution: 'Grease and cheese oils ruin paper pulping bales. Never recycle oil-soaked cardboard.',
      explanation: 'Soiled with grease. Clean lid is recyclable; oily base is non-recyclable.',
      uncertainty_flag: false,
      valid_json: true,
      model: 'gemini-3-flash-preview',
      provider: 'gemini',
      latency_ms: 280,
      disassembly_steps: [
        { part: 'Clean Top Lid', bin_name: 'Recycling bin', action: 'Tear off and place in paper/cardboard bin' },
        { part: 'Oily Bottom Base', bin_name: 'General waste / Compost', action: 'Compost in green bin or discard in trash' },
      ],
      eco_impact: {
        co2_saved_grams: 140,
        energy_saved_wh: 220,
        equivalency: 'Fully charges 18 smartphones and powers LED for 14 hours',
      },
    },
  },
  {
    id: 'yellow-bulb',
    name: 'Yellow Light Bulb',
    emoji: '💡',
    tag: 'general',
    tagLabel: '94% match',
    confidence: '94%',
    co2Saved: '0.00 kg',
    energyAvoided: '0.00 kWh',
    phoneEquiv: 'Proper trash disposal protects glass recycling bales',
    bulbEquiv: 'Shields sanitation workers from glass lacerations',
    contaminationAlert: {
      title: 'Non-Hazardous General Waste:',
      description: 'Incandescent/LED bulbs contain no toxic mercury. Do NOT put in glass recycling (heat-treated glass ruins furnaces). Wrap in paper/box before trash binning.',
      isContaminated: false,
    },
    upcyclingSteps: [
      { title: 'Broken/Burnt filament:', desc: 'Wrap securely in newspaper, plastic, or a cardboard box to prevent cut hazards.' },
      { title: 'Craft upcycling:', desc: 'Hollow out clear glass for DIY miniature terrariums or holiday ornaments.' },
      { title: 'Energy transition:', desc: 'Replace with high-efficiency LED bulbs to save 85% lighting electricity.' },
    ],
    ecoSwap: {
      title: 'Eco-Swap Suggestion:',
      description: 'Energy Star certified Smart LED Bulbs (15,000+ hour lifespan)',
      tags: ['Smart LED Bulbs', 'Low-energy lighting', 'Dimmable LEDs'],
    },
    result: {
      item_name: 'Yellow Incandescent Light Bulb',
      category: 'general' as WasteCategory,
      model_category: 'general',
      bin_name: 'Non-recyclable general waste',
      guidance: 'Put it in the regular non-hazardous general waste (trash) bin. Wrap securely in paper or a cardboard box to prevent cuts. Do not put in glass recycling.',
      caution: 'Incandescent, halogen, and LED bulbs contain no toxic mercury and belong in regular trash—never in glass recycling.',
      explanation: 'Contains no toxic mercury; classified as regular household trash. Heat-treated glass ruins glass recycling.',
      uncertainty_flag: false,
      valid_json: true,
      model: 'gemini-3-flash-preview',
      provider: 'gemini',
      latency_ms: 290,
      disassembly_steps: [
        { part: 'Glass Bulb Enclosure', bin_name: 'General waste bin', action: 'Wrap securely in paper or box to prevent cut hazards' },
      ],
      eco_impact: {
        co2_saved_grams: 0,
        energy_saved_wh: 0,
        equivalency: 'Wrapped securely to protect campus sanitation staff from injuries',
      },
    },
  },
  {
    id: 'broken-mug',
    name: 'Broken Ceramic Mug',
    emoji: '☕',
    tag: 'general',
    tagLabel: '92% match',
    confidence: '92%',
    co2Saved: '0.00 kg',
    energyAvoided: '0.00 kWh',
    phoneEquiv: 'Prevents melting furnace defects in glass plants',
    bulbEquiv: 'Safeguards cleaning crew from sharp porcelain shards',
    contaminationAlert: {
      title: 'Non-Recyclable Ceramics:',
      description: 'Ceramics have a much higher melting point than container glass and ruin recycling furnaces. Wrap shards in thick paper or cardboard before binning.',
      isContaminated: false,
    },
    upcyclingSteps: [
      { title: 'Kintsugi Artistry:', desc: 'Repair fractures with gold epoxy or resin for decorative desktop planters.' },
      { title: 'Planter drainage:', desc: 'Crush broken shards to line the bottom of indoor plant pots for superior root drainage.' },
      { title: 'Mosaic crafts:', desc: 'Use colorful glazed pieces for outdoor stepping stone mosaics.' },
    ],
    ecoSwap: {
      title: 'Eco-Swap Suggestion:',
      description: 'Double-walled stainless steel thermal mug or bamboo fiber tumblers',
      tags: ['Stainless travel mug', 'Bamboo tumbler', 'Shatterproof cup'],
    },
    result: {
      item_name: 'Broken Ceramic Mug (Crockery Shards)',
      category: 'general' as WasteCategory,
      model_category: 'general',
      bin_name: 'Non-recyclable general waste',
      guidance: 'Put it in the non-recyclable general waste bin. Wrap broken shards safely in newspaper or cardboard before binning to protect sanitation staff.',
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
  {
    id: 'soda-can',
    name: 'Crushed Soda Can',
    emoji: '🥫',
    tag: 'recycle',
    tagLabel: '98% match',
    confidence: '98%',
    co2Saved: '-0.17 kg',
    energyAvoided: '0.35 kWh',
    phoneEquiv: 'Equivalent to powering a laptop for 3.5 hours',
    bulbEquiv: 'Illuminates an LED desk lamp for 22 hours',
    contaminationAlert: {
      title: 'Prime Recyclable Aluminum:',
      description: 'Empty of liquid residue and place in campus metal recycling. Aluminum can be melted and re-manufactured indefinitely!',
      isContaminated: false,
    },
    upcyclingSteps: [
      { title: 'Empty & Rinse:', desc: 'Rinse out soda syrup to avoid attracting fruit flies or ants.' },
      { title: 'Crush flat:', desc: 'Compact vertically to conserve campus sorting bin capacity.' },
      { title: 'Infinite remelt:', desc: 'Recycled aluminum returns to supermarket shelves within 60 days.' },
    ],
    ecoSwap: {
      title: 'Eco-Swap Suggestion:',
      description: 'Stainless steel refillable water bottle or home soda siphons',
      tags: ['Refillable bottle', 'Home carbonator', 'Zero-waste drinks'],
    },
    result: {
      item_name: 'Aluminum Beverage Can',
      category: 'recyclable' as WasteCategory,
      model_category: 'recyclable',
      bin_name: 'Recycling bin',
      guidance: 'Empty liquid residue and place in campus metal recycling.',
      caution: 'Ensure cans are fully drained before placing in mixed paper/metal bins.',
      explanation: 'Infinitely recyclable aluminum with 95% energy savings over raw smelting.',
      uncertainty_flag: false,
      valid_json: true,
      model: 'gemini-3-flash-preview',
      provider: 'gemini',
      latency_ms: 280,
      eco_impact: {
        co2_saved_grams: 170,
        energy_saved_wh: 350,
        equivalency: 'Powers a student laptop for 3.5 hours',
      },
    },
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'scan' | 'map' | 'insights' | 'diy' | 'about'>('scan');
  const [activePreset, setActivePreset] = useState<DemoPreset>(DEMO_PRESETS[0]);
  const [upcycleStepIndex, setUpcycleStepIndex] = useState<number>(0);
  
  // Real scanner state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [scanResult, setScanResult] = useState<AnalyseResponse | null>(DEMO_PRESETS[0].result);
  
  // Voice synthesis & recognition state
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Gamification user state
  const [userScore, setUserScore] = useState({
    xp: 5200,
    level: 5,
    streakDays: 12,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync upcycle carousel index when preset changes
  useEffect(() => {
    setUpcycleStepIndex(0);
  }, [activePreset]);

  // Handle Preset Selection (1-click demo)
  const handleSelectPreset = (preset: DemoPreset) => {
    setActivePreset(preset);
    setScanResult(preset.result);
    setPreviewUrl(null);
    setImageBase64(null);
    setStatusText('');
  };

  // Upcycling Carousel navigation
  const nextUpcycleStep = () => {
    setUpcycleStepIndex((prev) => (prev + 1) % activePreset.upcyclingSteps.length);
  };
  const prevUpcycleStep = () => {
    setUpcycleStepIndex((prev) => (prev - 1 + activePreset.upcyclingSteps.length) % activePreset.upcyclingSteps.length);
  };

  // Voice Speech Synthesis Handler
  const handleVoiceSpeak = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this device.');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const currentItem = scanResult?.item_name || activePreset.name;
    const advice = activePreset.contaminationAlert
      ? `${currentItem}. ${activePreset.contaminationAlert.title} ${activePreset.contaminationAlert.description}`
      : `${currentItem}. Put it in ${scanResult?.bin_name || 'the designated bin'}. ${scanResult?.guidance || ''}`;

    const utterance = new SpeechSynthesisUtterance(advice);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Image upload handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusText('Please select an image file (JPEG, PNG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewUrl(dataUrl);
      const b64 = dataUrl.split(',')[1];
      setImageBase64(b64);
      setStatusText('Image ready. Click "Analyze Item" to scan.');
    };
    reader.readAsDataURL(file);
  };

  // Perform live analysis with Gemini backend
  const handleLiveScan = async () => {
    if (!imageBase64) {
      fileInputRef.current?.click();
      return;
    }

    setIsScanning(true);
    setStatusText('Classifying item with Gemini 3 Flash...');

    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageBase64,
          mime_type: 'image/jpeg',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error (${res.status})`);
      }

      const data: AnalyseResponse = await res.json();
      setScanResult(data);
      setStatusText('');

      // Award XP for scanning
      setUserScore((prev) => ({
        ...prev,
        xp: prev.xp + 150,
        streakDays: prev.streakDays + 1,
      }));
    } catch (err: any) {
      console.error('Scan error:', err);
      setStatusText(`Scan failed: ${err.message || 'Check network connection'}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <>
      {/* Schema.org Structured Data for Rich Search Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'EcoVision AI',
            url: 'https://ecovision-six.vercel.app',
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'All',
            description:
              'Instant AI waste classification, contamination detection, eco-impact translator, and drop-off maps for campuses and households.',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
          }),
        }}
      />

      {/* Monstera Ambient Botanical Leaves Overlay */}
      <div className="botanical-bg-leaves" aria-hidden="true">
        <svg viewBox="0 0 200 200" fill="currentColor">
          <path d="M100 0 C120 40 180 60 200 100 C160 120 140 180 100 200 C80 160 20 140 0 100 C40 80 60 20 100 0 Z" />
        </svg>
      </div>

      <div className="dashboard-wrapper">
        {/* Hidden SEO primary heading */}
        <h1 className="visually-hidden">
          EcoVision: AI-Powered Campus Sustainability, Live Waste Scanner & Eco-Gamification Hub
        </h1>

        {/* =========================================================
           TOP NAVIGATION BAR
           ========================================================= */}
        <header>
          <nav className="top-nav" aria-label="Main Navigation">
            <a href="/" className="brand-wrap" title="EcoVision AI Homepage">
              <div className="brand-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                </svg>
              </div>
              <span className="brand-name">EcoVision</span>
            </a>

            <ul className="nav-links">
              <li>
                <button
                  id="navLiveScan"
                  type="button"
                  className={`nav-link-btn ${activeTab === 'scan' ? 'active' : ''}`}
                  onClick={() => setActiveTab('scan')}
                >
                  Live Scan
                </button>
              </li>
              <li>
                <button
                  id="navMap"
                  type="button"
                  className={`nav-link-btn ${activeTab === 'map' ? 'active' : ''}`}
                  onClick={() => setActiveTab('map')}
                >
                  Map
                </button>
              </li>
              <li>
                <button
                  id="navInsights"
                  type="button"
                  className={`nav-link-btn ${activeTab === 'insights' ? 'active' : ''}`}
                  onClick={() => setActiveTab('insights')}
                >
                  Insights
                </button>
              </li>
              <li>
                <button
                  id="navDiyHub"
                  type="button"
                  className={`nav-link-btn ${activeTab === 'diy' ? 'active' : ''}`}
                  onClick={() => setActiveTab('diy')}
                >
                  DIY Hub
                </button>
              </li>
              <li>
                <button
                  id="navAbout"
                  type="button"
                  className={`nav-link-btn ${activeTab === 'about' ? 'active' : ''}`}
                  onClick={() => setActiveTab('about')}
                >
                  About
                </button>
              </li>
            </ul>

            <div className="user-profile-pill" id="userProfileBadge" title="User Level & Streak">
              <div className="user-profile-info">
                <span className="user-profile-title">User Profile: Level {userScore.level} 🔥</span>
                <span className="user-profile-badge">Badge: Eco Warrior</span>
              </div>
              <div className="avatar-ring">
                <span>🌱</span>
              </div>
            </div>
          </nav>
        </header>

        {/* =========================================================
           MAIN 3-COLUMN DASHBOARD GRID
           ========================================================= */}
        <main className="dashboard-grid">
          {/* -------------------------------------------------------
             COLUMN 1: LIVE ECO-SCANNER & ALERTS
             ------------------------------------------------------- */}
          <section className="col-container col-scanner" aria-labelledby="colHeaderScanner">
            <h2 id="colHeaderScanner" className="col-header">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m4.93 4.93 4.24 4.24" />
                <path d="m14.83 9.17 4.24-4.24" />
                <path d="m14.83 14.83 4.24 4.24" />
                <path d="m9.17 14.83-4.24 4.24" />
              </svg>
              Live Eco-Scanner & Alerts
            </h2>

            <article className="panel-card scanner-panel" id="scannerCard">
              {/* Scanner Viewport */}
              <div
                className="scanner-viewport-wrap"
                id="scannerViewport"
                onClick={() => fileInputRef.current?.click()}
                title="Click or drag image to scan"
              >
                <input
                  ref={fileInputRef}
                  id="cameraInput"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="visually-hidden"
                  onChange={handleFileChange}
                />

                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Live waste scan preview" className="scanner-video-preview" />
                ) : (
                  <div className="scanner-preset-preview" style={{ width: '100%', height: '100%', position: 'relative' }}>
                    {/* Stylized Vector SVG Preview for Current Preset Item */}
                    <svg viewBox="0 0 600 360" className="scanner-video-preview" style={{ background: '#0a1a15' }}>
                      <defs>
                        <radialGradient id="gradItem" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#1e3a32" />
                          <stop offset="100%" stopColor="#0a1a15" />
                        </radialGradient>
                      </defs>
                      <rect width="600" height="360" fill="url(#gradItem)" />
                      {/* Stylized Box / Container graphic */}
                      <g transform="translate(180, 70)">
                        <rect x="0" y="30" width="240" height="150" rx="16" fill="#8d6e63" stroke="#d7ccc8" strokeWidth="3" opacity="0.9" />
                        <rect x="15" y="15" width="210" height="30" rx="6" fill="#6d4c41" opacity="0.8" />
                        {/* Oil / grease stains illustrative markings */}
                        <path d="M70 70 Q90 60 110 80 T150 75 Q160 100 130 110 T80 100 Z" fill="#4e342e" opacity="0.65" />
                        <circle cx="100" cy="85" r="14" fill="#3e2723" opacity="0.75" />
                      </g>
                    </svg>

                    {/* Reticle Bounding Box with Confidence Badge */}
                    <div className="scanner-reticle-box">
                      <div className="scanner-label-tag">
                        <span>{activePreset.name}</span>
                        <span className="confidence-badge">{activePreset.confidence} match</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Animated Laser Sweep */}
                <div className="scanner-scanline" aria-hidden="true"></div>
              </div>

              {/* Action Bar (Analyze & Camera) */}
              <div className="scanner-action-bar">
                <button
                  id="analyseBtn"
                  type="button"
                  className="btn-scan-main"
                  onClick={handleLiveScan}
                  disabled={isScanning}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {isScanning ? 'Analyzing with Gemini AI...' : 'Analyze Item'}
                </button>

                <button
                  id="cameraUploadBtn"
                  type="button"
                  className="btn-camera-snap"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload photo from device or camera"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
              </div>

              {statusText && (
                <div className="status-msg" style={{ marginTop: '10px', fontSize: '13px', color: '#fbbf24' }}>
                  {statusText}
                </div>
              )}
            </article>

            {/* Contamination Alert Banner (or Safety Guidance) */}
            {activePreset.contaminationAlert && (
              <aside
                className={activePreset.contaminationAlert.isContaminated ? 'alert-contamination-card' : 'alert-clean-card'}
                id="contaminationAlertBanner"
                aria-live="polite"
              >
                <div className={activePreset.contaminationAlert.isContaminated ? 'alert-contamination-header' : 'alert-clean-header'}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>((⚠️)) {activePreset.contaminationAlert.title}</span>
                </div>
                <p className={activePreset.contaminationAlert.isContaminated ? 'alert-contamination-desc' : 'alert-clean-desc'}>
                  {activePreset.contaminationAlert.description}
                </p>
              </aside>
            )}

            {/* Voice Control & AI Active Widget */}
            <article className="voice-ai-card" id="voiceControlWidget">
              <div className="voice-ai-status-row">
                <div className="voice-status-pill">
                  <span className="indicator-dot"></span>
                  <span>AI Active | Voice Control: Enabled</span>
                </div>
              </div>

              <div className="voice-ai-prompt">
                Speak: &ldquo;How do I prep this?&rdquo;
              </div>

              <div className="voice-mic-waveform-row">
                <button
                  id="voiceMicBtn"
                  type="button"
                  className={`mic-action-btn ${isSpeaking ? 'active' : ''}`}
                  onClick={handleVoiceSpeak}
                  title="Click to hear disposal voice guidance"
                  aria-label="Listen to disposal advice"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </button>

                <div className="waveform-bars" aria-hidden="true">
                  {[12, 24, 18, 28, 16, 22, 10, 26, 14, 20, 8, 18, 25, 12, 22, 16].map((h, i) => (
                    <span
                      key={i}
                      className={`waveform-bar ${isSpeaking ? 'active' : ''}`}
                      style={{
                        height: isSpeaking ? `${h}px` : '6px',
                        animationDelay: `${i * 0.08}s`,
                      }}
                    ></span>
                  ))}
                </div>
              </div>
            </article>

            {/* 1-Click Demo Carousel */}
            <div className="quick-test-section">
              <div className="quick-test-header">
                <span>🎯 Quick-Test Demo Items</span>
                <span className="quick-test-badge">1-Click Live</span>
              </div>
              <div className="quick-test-scroller">
                {DEMO_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`quick-test-btn ${activePreset.id === p.id ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(p)}
                  >
                    <span>{p.emoji}</span>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* -------------------------------------------------------
             COLUMN 2: THE SUSTAINABILITY HUB
             ------------------------------------------------------- */}
          <section className="col-container col-sustainability" aria-labelledby="colHeaderSustainability">
            <h2 id="colHeaderSustainability" className="col-header">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              The Sustainability Hub
            </h2>

            {/* 1. Dynamic Impact Translator */}
            <article className="panel-card" id="impactTranslatorCard">
              <div className="card-section-title">
                <span>Dynamic Impact Translator</span>
              </div>

              <div className="impact-translator-grid">
                <div className="impact-metric-pill">
                  <div className="metric-icon co2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                    </svg>
                  </div>
                  <div className="metric-value-block">
                    <b>{activePreset.co2Saved}</b>
                    <small>CO2e saved</small>
                  </div>
                </div>

                <div className="impact-metric-pill">
                  <div className="metric-icon energy">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div className="metric-value-block">
                    <b>{activePreset.energyAvoided}</b>
                    <small>avoided</small>
                  </div>
                </div>
              </div>

              <div className="impact-comparison-cards" style={{ marginTop: '12px' }}>
                <div className="equiv-card">
                  <div className="thumb-icon">📱</div>
                  <span>{activePreset.phoneEquiv}</span>
                </div>
                <div className="equiv-card">
                  <div className="thumb-icon">💡</div>
                  <span>{activePreset.bulbEquiv}</span>
                </div>
              </div>
            </article>

            {/* 2. Local Drop-off Map */}
            <article className="panel-card" id="localMapCard">
              <div className="card-section-title">
                <span>Local Drop-off Map</span>
              </div>

              <div className="map-panel">
                {/* Stylized Vector Map Graphic with Campus Roads & Bins */}
                <svg className="map-svg-canvas" viewBox="0 0 500 200" preserveAspectRatio="none">
                  <rect width="500" height="200" fill="#14322b" />
                  {/* Road Grid lines */}
                  <path d="M 0 50 L 500 50 M 0 130 L 500 130 M 120 0 L 120 200 M 280 0 L 280 200 M 420 0 L 420 200" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  {/* Green park patches */}
                  <rect x="135" y="10" width="130" height="35" rx="6" fill="#1b4339" />
                  <rect x="295" y="60" width="115" height="60" rx="8" fill="#1e4d41" />
                  <rect x="20" y="65" width="85" height="55" rx="6" fill="#1b4339" />
                  {/* Compass/Location Pin Marker */}
                  <g transform="translate(250, 75)">
                    <circle cx="0" cy="0" r="14" fill="#ea580c" opacity="0.4" />
                    <circle cx="0" cy="0" r="7" fill="#f97316" />
                    <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                  </g>
                </svg>

                <button
                  id="quickNavBtn"
                  type="button"
                  className="map-quick-nav-btn"
                  onClick={() => alert('Opening Campus Smart Bin Navigation: Heading to City Composting Center (1.2 miles away).')}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                  <span>Quick navigation</span>
                </button>

                <div className="map-location-bubble">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>Specialized e-waste/Soiled waste · City Composting Center - 1.2 miles away</span>
                </div>
              </div>
            </article>

            {/* 3. AI Upcycling Suggestions (3-Step Carousel) */}
            <article className="panel-card" id="upcyclingCard">
              <div className="upcycling-panel-header">
                <span className="card-section-title" style={{ margin: 0 }}>
                  AI Upcycling Suggestions (3-Step Carousel)
                </span>
              </div>
              <div className="upcycling-panel-subtitle">
                Custom recipes generated for found items.
              </div>

              <div className="upcycle-carousel-row">
                <button
                  id="upcyclePrevBtn"
                  type="button"
                  className="carousel-arrow-btn"
                  onClick={prevUpcycleStep}
                  title="Previous upcycling step"
                  aria-label="Previous step"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                <div className="upcycle-card-parchment">
                  <b>{activePreset.upcyclingSteps[upcycleStepIndex].title}</b>
                  <p>{activePreset.upcyclingSteps[upcycleStepIndex].desc}</p>
                </div>

                <button
                  id="upcycleNextBtn"
                  type="button"
                  className="carousel-arrow-btn"
                  onClick={nextUpcycleStep}
                  title="Next upcycling step"
                  aria-label="Next step"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </article>
          </section>

          {/* -------------------------------------------------------
             COLUMN 3: GAMIFICATION & ALTERNATIVE SHOP
             ------------------------------------------------------- */}
          <section className="col-container col-gamification" aria-labelledby="colHeaderGamification">
            <h2 id="colHeaderGamification" className="col-header">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              Gamification & Alternative Shop
            </h2>

            {/* 1. Eco-Swap Alternative Finder */}
            <article className="panel-card" id="ecoSwapCard">
              <div className="card-section-title">
                <span>Eco-Swap Alternative Finder</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Recommending products based on your scan history.
              </p>

              <div className="eco-swap-parchment-box">
                <div className="eco-swap-title">{activePreset.ecoSwap.title}</div>
                <div className="eco-swap-desc">{activePreset.ecoSwap.description}</div>
                <div className="eco-swap-tags-wrap">
                  {activePreset.ecoSwap.tags.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="eco-swap-pill"
                      onClick={() => alert(`Exploring sustainable eco-alternative: ${tag}`)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </article>

            {/* 2. Progress Scoreboard */}
            <article className="panel-card" id="scoreboardCard">
              <div className="progress-scoreboard-top">
                <div className="xp-counter-number">
                  <span>⚡</span>
                  <span>{userScore.xp.toLocaleString()} XP</span>
                </div>
                <span className="user-level-tag">Level {userScore.level}</span>
              </div>

              {/* Golden Progress Bar */}
              <div className="xp-progress-track">
                <div className="xp-progress-fill" style={{ width: '78%' }}></div>
              </div>

              {/* Eco Streak Banner */}
              <div className="eco-streak-banner">
                <span>🔥</span>
                <span>{userScore.streakDays}-day Eco Streak</span>
              </div>

              {/* Unlockable Badges */}
              <div className="badges-gallery-title">Unlockable Badges:</div>
              <div className="badges-gallery-row">
                <div className="badge-item-card" id="badgeCompostHero" title="Compost Hero: Master of organic and soiled waste diversion">
                  <div className="badge-shield unlocked">🪴</div>
                  <span className="badge-name-label">Compost Hero</span>
                </div>

                <div className="badge-item-card" id="badgeMaterialMaster" title="Material Master: Separated 10+ composite packaging items">
                  <div className="badge-shield unlocked">📦</div>
                  <span className="badge-name-label">Material Master</span>
                </div>

                <div className="badge-item-card" id="badgeSpecialist" title="Specialist: 5,000+ XP milestone reached">
                  <div className="badge-shield unlocked">🎖️</div>
                  <span className="badge-name-label">Specialist</span>
                </div>
              </div>
            </article>

            {/* Composite Item Disassembly Guide (if detected) */}
            {scanResult?.disassembly_steps && scanResult.disassembly_steps.length > 0 && (
              <article className="disassembly-guide-box" id="disassemblyGuide">
                <div className="disassembly-guide-title">
                  <span>⚠️ Multi-Part Component Separation</span>
                </div>
                {scanResult.disassembly_steps.map((step, idx) => {
                  const bName = step.bin_name.toLowerCase();
                  const badgeColor =
                    bName.includes('recycl') ? 'blue' :
                    bName.includes('organ') || bName.includes('compost') ? 'green' :
                    bName.includes('hazard') || bName.includes('e-waste') ? 'red' : 'grey';
                  return (
                    <div key={idx} className="disassembly-step-row">
                      <div>
                        <strong>{step.part}:</strong> {step.action}
                      </div>
                      <span className={`bin-badge ${badgeColor}`}>{step.bin_name}</span>
                    </div>
                  );
                })}
              </article>
            )}
          </section>
        </main>

        {/* =========================================================
           FOOTER
           ========================================================= */}
        <footer className="footer-bar">
          <div>
            EcoVision Mini AI · Campus Sustainability Hub · Powered by Gemini 3 Flash
          </div>
          <nav className="footer-nav" aria-label="Footer Navigation">
            <a href="/api/health" target="_blank" rel="noopener noreferrer">Health</a>
            <a href="/api/rules" target="_blank" rel="noopener noreferrer">Campus Rules</a>
            <a href="/api/stats" target="_blank" rel="noopener noreferrer">API Stats</a>
          </nav>
        </footer>
      </div>
    </>
  );
}
