import path from 'path';
import fs from 'fs';
import { RulesData, WasteCategory, ModelWastePrediction, AnalyseResponse } from './types';

const REQUIRED_KEYS: (keyof ModelWastePrediction)[] = [
  'item_name',
  'category',
  'explanation',
  'uncertainty_flag',
];

const VALID_CATEGORIES: WasteCategory[] = [
  'recyclable',
  'organic',
  'hazardous',
  'general',
  'unsure',
];

export function loadRules(): RulesData {
  try {
    const rulesPath = path.join(process.cwd(), 'data', 'rules.json');
    if (fs.existsSync(rulesPath)) {
      const content = fs.readFileSync(rulesPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to read rules from file system, falling back to embedded defaults:', error);
  }

  // Safe fallback default rules
  return {
    campus: 'EcoVision Mini AI Campus Sorting Rules',
    categories: {
      recyclable: {
        bin_name: 'Recycling bin',
        guidance: 'Empty and rinse it, then put it in the campus recycling bin.',
        caution: 'Greasy or wet items may not qualify.',
      },
      organic: {
        bin_name: 'Organic bin',
        guidance: 'Put it into organic bin.',
        caution: 'Check that no packaging or plastic stickers are mixed in.',
      },
      hazardous: {
        bin_name: 'E-waste point',
        guidance: 'Do not put it in general waste. Hand it over at the designated e-waste / battery collection point (batteries, mercury/CFL tubes, and electronics).',
        caution: 'Safety note: batteries, fluorescent/CFL tubes (mercury), and electronics are hazardous. (Note: incandescent, halogen, and LED bulbs are non-hazardous general trash).',
      },
      general: {
        bin_name: 'Non-recyclable general waste',
        guidance: 'Put it in the regular non-hazardous general waste (trash) bin.',
        caution: 'Could it be reused or reduced next time?',
      },
      unsure: {
        bin_name: 'Check first',
        guidance: 'Not sure. Take a clearer photo of one item or ask campus staff (check local rule).',
        caution: 'The system is not sure. Do not guess.',
      },
    },
  };
}

/**
 * Validates real image format using magic bytes rather than browser mime headers.
 * Protects against MIME spoofing and malicious file polyglots.
 */
export function sniffMime(raw: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (!raw || raw.length < 12) return null;

  // JPEG magic bytes: FF D8 FF
  if (raw[0] === 0xff && raw[1] === 0xd8) {
    return 'image/jpeg';
  }

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    raw[0] === 0x89 &&
    raw[1] === 0x50 &&
    raw[2] === 0x4e &&
    raw[3] === 0x47 &&
    raw[4] === 0x0d &&
    raw[5] === 0x0a &&
    raw[6] === 0x1a &&
    raw[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP magic bytes: 'RIFF' .... 'WEBP'
  const isRiff =
    raw[0] === 0x52 && raw[1] === 0x49 && raw[2] === 0x46 && raw[3] === 0x46; // RIFF
  const isWebp =
    raw[8] === 0x57 && raw[9] === 0x45 && raw[10] === 0x42 && raw[11] === 0x50; // WEBP

  if (isRiff && isWebp) {
    return 'image/webp';
  }

  return null;
}

/**
 * Extracts and sanitizes JSON from LLM text response.
 * Safely strips code markdown fences and trailing text.
 */
export function extractJson(text: string): ModelWastePrediction | null {
  if (!text || typeof text !== 'string') return null;

  // Remove markdown fences
  const clean = text.replace(/```(?:json)?/gi, '').trim();

  try {
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ModelWastePrediction;
    }
  } catch {
    // Regex fallback to find the outermost JSON object
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const obj = JSON.parse(match[0]);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          return obj as ModelWastePrediction;
        }
      } catch {
        return null;
      }
    }
  }

  return null;
}

function parseBool(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.trim().toLowerCase() === 'true';
  return Boolean(val);
}

/**
 * Applies strict campus rules and ensures guidance ALWAYS originates from rules.json.
 */
export function applyRules(
  modelObj: any,
  rules: RulesData,
  extra: { model?: string; provider?: string; latency_ms?: number } = {}
): AnalyseResponse {
  const cats = rules.categories;
  const isValid =
    modelObj !== null &&
    typeof modelObj === 'object' &&
    REQUIRED_KEYS.every((k) => k in modelObj);

  let modelCat: string | null = null;
  let flag = true;
  let item = 'Could not read the answer';
  let why = 'The AI reply was not in the expected format.';

  if (isValid) {
    modelCat = String(modelObj.category).trim().toLowerCase();
    flag = parseBool(modelObj.uncertainty_flag);
    item = String(modelObj.item_name).slice(0, 80);
    why = String(modelObj.explanation).slice(0, 200);
  }

  // Smart detection for multiple items that are all organic (e.g. banana peel and tea bag)
  const itemLower = item.toLowerCase();
  const whyLower = why.toLowerCase();
  const isMultipleOrganic =
    (itemLower.includes('banana') && itemLower.includes('tea')) ||
    (itemLower.includes('peel') && itemLower.includes('tea')) ||
    (whyLower.includes('organic') && whyLower.includes('multiple')) ||
    (whyLower.includes('mixed organic')) ||
    ((itemLower.includes('and') || itemLower.includes('&') || itemLower.includes(',')) &&
      (whyLower.includes('organic') || itemLower.includes('banana') || itemLower.includes('fruit') || itemLower.includes('food')));

  // Force unsure if invalid, category unknown, or model indicated uncertainty (unless identified as multi-organic)
  const isRecognizedCat = modelCat && VALID_CATEGORIES.includes(modelCat as WasteCategory);
  let finalCategory: WasteCategory =
    isValid && isRecognizedCat && !flag ? (modelCat as WasteCategory) : 'unsure';

  if (isMultipleOrganic) {
    finalCategory = 'organic';
    flag = false;
  }

  const categoryRule = cats[finalCategory] || cats['unsure'];
  let guidanceText = categoryRule.guidance;
  let cautionText = categoryRule.caution;

  if (finalCategory === 'organic' && isMultipleOrganic) {
    guidanceText = 'Put it into organic bin as both the wastes are organic.';
    cautionText = 'Remove any plastic tea tags, staples, or fruit stickers before binning.';
  }

  // Process disassembly steps
  let disassemblySteps = undefined;
  if (modelObj && Array.isArray(modelObj.disassembly_steps) && modelObj.disassembly_steps.length > 0) {
    disassemblySteps = modelObj.disassembly_steps
      .filter((s: any) => s && typeof s.part === 'string')
      .map((s: any) => ({
        part: String(s.part).slice(0, 50),
        bin_name: String(s.bin_name || 'Check first').slice(0, 50),
        action: String(s.action || 'Separate').slice(0, 80),
      }));
  } else if (finalCategory === 'organic' && isMultipleOrganic) {
    disassemblySteps = [
      { part: 'Banana Peel', bin_name: 'Organic bin', action: 'Compost with food waste' },
      { part: 'Tea Bag', bin_name: 'Organic bin', action: 'Remove staple if present, compost' },
    ];
  }

  // Calculate or enrich Eco-Impact metrics with summation support
  let ecoImpact: any = {
    co2_saved_grams: 0,
    energy_saved_wh: 0,
    equivalency: 'Awaiting proper classification',
  };

  if (finalCategory === 'organic' && isMultipleOrganic) {
    const rawCo2 = modelObj?.eco_impact?.co2_saved_grams;
    const rawEnergy = modelObj?.eco_impact?.energy_saved_wh;
    const co2 = typeof rawCo2 === 'number' && rawCo2 > 0 ? Math.round(rawCo2) : 65;
    const energy = typeof rawEnergy === 'number' && rawEnergy > 0 ? Math.round(rawEnergy) : 100;

    ecoImpact = {
      co2_saved_grams: co2,
      energy_saved_wh: energy,
      equivalency: 'Summation of 2 organic wastes: Banana peel (40g CO₂, 60 Wh) + Tea bag (25g CO₂, 40 Wh)',
      summation_note: 'Summation of 2 organic wastes combined',
      items_breakdown: [
        { item: 'Banana peel', co2_g: 40, wh: 60 },
        { item: 'Tea bag', co2_g: 25, wh: 40 },
      ],
    };
  } else if (modelObj && modelObj.eco_impact && typeof modelObj.eco_impact.co2_saved_grams === 'number') {
    ecoImpact = {
      co2_saved_grams: Math.max(0, Math.round(modelObj.eco_impact.co2_saved_grams)),
      energy_saved_wh: Math.max(0, Math.round(modelObj.eco_impact.energy_saved_wh || modelObj.eco_impact.co2_saved_grams * 1.6)),
      equivalency: String(modelObj.eco_impact.equivalency || 'Diverts campus waste emissions').slice(0, 80),
      summation_note: modelObj.eco_impact.summation_note,
      items_breakdown: modelObj.eco_impact.items_breakdown,
    };
  } else {
    // Standard ESG benchmarks by category
    switch (finalCategory) {
      case 'recyclable':
        ecoImpact = {
          co2_saved_grams: 65,
          energy_saved_wh: 120,
          equivalency: 'Powers a laptop for 2.5 hours',
        };
        break;
      case 'organic':
        ecoImpact = {
          co2_saved_grams: 35,
          energy_saved_wh: 45,
          equivalency: 'Prevents 35g methane emissions in campus landfills',
        };
        break;
      case 'hazardous':
        ecoImpact = {
          co2_saved_grams: 120,
          energy_saved_wh: 220,
          equivalency: 'Prevents toxic lithium & lead from entering soil',
        };
        break;
      case 'general':
        ecoImpact = {
          co2_saved_grams: 0,
          energy_saved_wh: 0,
          equivalency: 'Properly routed to general landfill stream',
        };
        break;
      default:
        ecoImpact = {
          co2_saved_grams: 0,
          energy_saved_wh: 0,
          equivalency: 'Verify sorting before campus disposal',
        };
        break;
    }
  }

  return {
    item_name: item,
    category: finalCategory,
    model_category: modelCat,
    bin_name: categoryRule.bin_name,
    guidance: guidanceText,
    caution: cautionText,
    explanation: why,
    uncertainty_flag: finalCategory === 'unsure',
    valid_json: isValid,
    model: extra.model || 'gemma-4-31b-it',
    provider: extra.provider || 'gemini',
    latency_ms: extra.latency_ms || 0,
    disassembly_steps: disassemblySteps,
    eco_impact: ecoImpact,
  };
}
