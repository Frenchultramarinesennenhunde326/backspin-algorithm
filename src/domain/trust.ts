/**
 * Domain: TrustRank, the user trust signal in AttentionScore.
 *
 * trust_score is one term of the published formula:
 *
 *   AttentionScore = activity + focus + session_quality + workflow_relevance + trust_score - fraud_risk
 *
 * A user who has accrued a history of eligible (verified-human) windows has
 * demonstrated trustworthiness; a user whose windows are mostly ineligible
 * (unfocused, no activity, bot-like) erodes it. A brand-new user with no
 * history sits exactly at the neutral baseline, so they are scored as before.
 *
 * Pure function, zero I/O. Computed from the user's PRIOR window history (the
 * current window is not yet counted), so it reflects an earned track record.
 * The full fraud engine is a later spec and only refines this; the formula and
 * contract never change.
 */

/** A user's prior window history, the input to TrustRank. */
export interface TrustHistory {
  /** Eligible (passed the human-score gate) windows before the current one. */
  priorEligibleWindows: number;
  /** Total windows before the current one. */
  priorTotalWindows: number;
}

/** Neutral baseline: a user with no history scores here (matches the old constant). */
export const NEUTRAL_TRUST = 10;
/** Trust floor and ceiling, keeping trust a bounded term in the formula. */
export const MIN_TRUST = 0;
export const MAX_TRUST = 20;
/**
 * Bayesian smoothing weight, split evenly as a positive/negative prior. With
 * NEUTRAL_TRUST = MAX_TRUST / 2, an empty history lands exactly on neutral.
 */
const SMOOTHING = 10;

/**
 * Compute a user's TrustRank from their prior window history.
 *
 * Bayesian midpoint: each eligible window is positive evidence, each
 * ineligible window is negative, started from an even SMOOTHING/2 prior so a
 * small sample stays near neutral. The result is clamped to [MIN, MAX].
 */
export function computeTrustScore(history: TrustHistory): number {
  const eligible = Math.max(0, history.priorEligibleWindows);
  const total = Math.max(eligible, history.priorTotalWindows);
  const ineligible = total - eligible;

  const positive = SMOOTHING / 2 + eligible;
  const negative = SMOOTHING / 2 + ineligible;
  const trust = (MAX_TRUST * positive) / (positive + negative);

  return Math.max(MIN_TRUST, Math.min(MAX_TRUST, trust));
}
