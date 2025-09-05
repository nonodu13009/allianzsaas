export const CDC_CONFIG = {
  processMonthlyTarget: 15, // objectif de process pour être éligible
  minDailyCadence: 2, // effort recommandé par jour
};

// Helper to format or override later by environment
export function getCdcConfig() {
  return CDC_CONFIG;
}


