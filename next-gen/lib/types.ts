export type WasteCategory = 'recyclable' | 'organic' | 'hazardous' | 'general' | 'unsure';

export interface CategoryRule {
  bin_name: string;
  guidance: string;
  caution: string;
}

export interface RulesData {
  campus: string;
  categories: Record<WasteCategory, CategoryRule>;
}

export interface DisassemblyStep {
  part: string;
  bin_name: string;
  action: string;
}

export interface EcoBreakdownItem {
  item: string;
  co2_g: number;
  wh: number;
}

export interface EcoImpact {
  co2_saved_grams: number;
  energy_saved_wh: number;
  equivalency: string;
  summation_note?: string;
  items_breakdown?: EcoBreakdownItem[];
}

export interface ModelWastePrediction {
  item_name: string;
  category: WasteCategory;
  explanation: string;
  uncertainty_flag: boolean | string;
  disassembly_steps?: DisassemblyStep[];
  eco_impact?: EcoImpact;
}

export interface AnalyseRequestBody {
  image_base64: string;
  mime_type?: string;
}

export interface AnalyseResponse {
  item_name: string;
  category: WasteCategory;
  model_category?: string | null;
  bin_name: string;
  guidance: string;
  caution: string;
  explanation: string;
  uncertainty_flag: boolean;
  valid_json: boolean;
  model: string;
  provider: string;
  latency_ms: number;
  disassembly_steps?: DisassemblyStep[];
  eco_impact: EcoImpact;
}

export interface HealthResponse {
  ok: boolean;
  provider: string;
  model: string;
  key_set: boolean;
}

export interface StatsResponse {
  total_scans: number;
  by_category: Record<string, number>;
  note: string;
}
