const completionClaims = new Map();

export const claimGuidedCompletion = (stepId) => {
  if (!stepId || completionClaims.has(stepId)) return null;

  const token = Symbol(stepId);
  completionClaims.set(stepId, token);
  return token;
};

export const releaseGuidedCompletion = (stepId, token) => {
  if (completionClaims.get(stepId) === token) {
    completionClaims.delete(stepId);
  }
};

export const holdGuidedCompletionClaim = (stepId, token) => {
  if (typeof window === "undefined") return;

  window.setTimeout(() => releaseGuidedCompletion(stepId, token), 2_000);
};

export const clearGuidedCompletionClaims = () => completionClaims.clear();
