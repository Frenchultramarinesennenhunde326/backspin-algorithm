/**
 * Scoring contracts - the typed inputs for BackSpin's attention and campaign
 * scoring, plus the quality-adjusted attention unit.
 *
 * These are pure contracts. Exact signal weights, fraud thresholds, and
 * detection signatures are closed and live server-side; only the input
 * shapes and the published formulas live here.
 */

/**
 * Inputs to the per-window attention score.
 *
 * Formula (published, exact):
 *   AttentionScore = activity + focus + session_quality + workflow_relevance + trust_score − fraud_risk
 */
export interface AttentionScoreInputs {
  /** Keyboard/mouse activity signal contribution. */
  activity: number;
  /** Focus signal contribution (IDE focused, active tab, non-backgrounded). */
  focus: number;
  /** Session validity and quality contribution. */
  session_quality: number;
  /** How well the window matches the advertiser's targeted workflow. */
  workflow_relevance: number;
  /** User/session trust contribution. */
  trust_score: number;
  /** Fraud-risk penalty subtracted from the score. */
  fraud_risk: number;
}

/**
 * Inputs to the campaign delivery score. Delivery is NOT highest-bid-wins:
 * relevance, usefulness, trust, and fairness all weigh in.
 *
 * Formula (published, exact):
 *   CampaignScore = bid_weight × relevance × attention_quality × user_preference × advertiser_reputation × fairness_factor
 */
export interface CampaignScoreInputs {
  /** Spend-derived weight. */
  bid_weight: number;
  /** Relevance of the campaign to the window context. */
  relevance: number;
  /** Quality of the attention being served against. */
  attention_quality: number;
  /** User preference / opt-in alignment multiplier. */
  user_preference: number;
  /** Advertiser reputation multiplier (lowered by dismiss rate and "annoying" votes). */
  advertiser_reputation: number;
  /** Fairness multiplier: base floor, category caps, diversity, new-campaign boost. */
  fairness_factor: number;
}

/**
 * Quality-adjusted attention in seconds - the billable unit (priced CPAS).
 *
 *   weighted_attention = raw_seconds × (attention_score / 100)
 *
 * Pure function: no I/O, no side effects.
 *
 * @param rawSeconds     Raw attention-seconds measured for the window.
 * @param attentionScore AttentionScore on a 0-100 scale.
 * @returns The quality-adjusted attention-seconds.
 */
export function weightedAttention(
  rawSeconds: number,
  attentionScore: number
): number {
  return rawSeconds * (attentionScore / 100);
}
