const isIncompleteVisibleStep = (step) =>
  Boolean(
    step &&
    step.applicable !== false &&
    step.status !== "complete" &&
    step.status !== "not_applicable",
  );

const isActionableRecommendation = (recommendation) =>
  Boolean(
    recommendation &&
    recommendation.complete !== true &&
    recommendation.action?.enabled,
  );

export const hasLaunchCenterAttention = (setup) => {
  if (!setup) return false;

  const steps = Array.isArray(setup.steps) ? setup.steps : [];
  const recommendations = Array.isArray(setup.recommendations)
    ? setup.recommendations
    : [];

  if (steps.some(isIncompleteVisibleStep)) return true;
  if (recommendations.some(isActionableRecommendation)) {
    return true;
  }

  const percentage = Number(setup?.progress?.percentage);

  return (
    setup.phase !== "learning" &&
    Number.isFinite(percentage) &&
    percentage < 100
  );
};
