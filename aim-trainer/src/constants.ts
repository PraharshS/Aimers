export const DEFAULT_DOT_SIZE = 1
export const DEFAULT_DOT_DEPTH = 1.5
export const DEFAULT_DOT_COLOR = '#58d6ff'
export const DEFAULT_BG_DEPTH = 1.12

export const DEFAULT_DPI = 800
export const DEFAULT_VALORANT_SENS = 0.5;
export const MAX_TARGETS = [1,2,3,4,5,6];

// Valorant's fixed yaw: degrees of camera rotation per single mouse count
export const VALORANT_YAW = 0.07

// Multiplier baseline: DEFAULT_DPI × DEFAULT_VALORANT_SENS × VALORANT_YAW
// At these defaults, sensMultiplierRef = 1.0 (no scaling applied)
export const SENS_BASE_SCALE = DEFAULT_DPI * DEFAULT_VALORANT_SENS * VALORANT_YAW // 28
