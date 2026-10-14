// EcoVision Global Configuration
// NOTE: Secrets and API keys should NEVER be hardcoded in tracked files.
// To configure your API key locally:
// 1. Copy config.local.example.js to config.local.js and add your key, OR
// 2. Set GEMINI_API_KEY in your local .env, OR
// 3. Enter your key in the web application UI settings panel.

window.ECOVISION_CONFIG = {
  GEMINI_API_KEY: (typeof window !== 'undefined' && window.ECOVISION_LOCAL_CONFIG && window.ECOVISION_LOCAL_CONFIG.GEMINI_API_KEY) || ""
};
