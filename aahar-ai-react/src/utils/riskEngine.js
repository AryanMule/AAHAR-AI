export function computeRiskScores(analysis, profile) {
  const CONFIDENCE_MAP = {
    definite: 1.0,
    likely: 0.8,
    possible: 0.4,
  };

  let maxRisk = 0;

  (analysis.allergens || []).forEach((a) => {
    const confidence = CONFIDENCE_MAP[a.risk] || 0.5;

    const match = (profile.allergies || []).find((ua) =>
      a.name.toLowerCase().includes(ua.toLowerCase())
    );

    const severityWeight = match ? 1 : 0.5;

    a.riskScore = +(confidence * severityWeight).toFixed(2);

    if (a.riskScore > maxRisk) maxRisk = a.riskScore;
  });

  analysis.overallRiskScore = maxRisk;
}