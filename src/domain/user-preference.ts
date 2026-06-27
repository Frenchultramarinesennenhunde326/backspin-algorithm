/**
 * Domain: user_preference, the personalization multiplier in CampaignScore.
 *
 * user_preference is one factor of the published ranking formula:
 *
 *   CampaignScore = bid_weight x relevance x attention_quality
 *                 x user_preference x advertiser_reputation x fairness_factor
 *
 * It is computed per (user, category) from the user's OWN feedback history:
 * cards they rated "useful" or saved are positive evidence for that category,
 * cards they rated "annoying" are negative. A user with no history for a
 * category sits exactly at neutral (1.0), so personalization only refines a
 * score once the user has actually expressed a preference.
 *
 * This is the SOFT signal. The HARD opt-out — muting a category — is enforced
 * upstream in ranking (a muted category's campaigns are dropped entirely), so
 * this multiplier never has to represent "never show me this".
 *
 * Pure function, zero I/O. Bounded to a narrow band so preference tilts the
 * ranking without letting it dominate bid, quality, or reputation. Mirrors the
 * Bayesian-smoothing shape of trust.ts so a small sample stays near neutral.
 */

/** A user's feedback tally for one discovery category. */
export interface CategorySentiment {
  /** Cards in this category the user rated "useful". */
  useful: number;
  /** Cards in this category the user rated "annoying". */
  annoying: number;
  /** Cards in this category the user saved for later (a positive signal). */
  saved: number;
}

/** Neutral multiplier: a category the user has never reacted to. */
export const NEUTRAL_USER_PREFERENCE = 1;
/** Band edges, so preference nudges ranking without dominating it. */
export const MIN_USER_PREFERENCE = 0.7;
export const MAX_USER_PREFERENCE = 1.3;
/**
 * Smoothing weight: positive/negative evidence is discounted by this prior so a
 * single rating barely moves the factor and a consistent history moves it more.
 */
const PREFERENCE_SMOOTHING = 4;

/**
 * Compute the user_preference multiplier for a (user, category) from the user's
 * feedback tally. Saves and "useful" ratings are positive; "annoying" ratings
 * are negative. The net sentiment is smoothed toward neutral and mapped onto a
 * symmetric band around 1.0. No history -> exactly neutral.
 */
export function userPreferenceFactor(sentiment: CategorySentiment): number {
  const positive = Math.max(0, sentiment.useful) + Math.max(0, sentiment.saved);
  const negative = Math.max(0, sentiment.annoying);
  const evidence = positive + negative;
  if (evidence === 0) return NEUTRAL_USER_PREFERENCE;

  // Net sentiment in (-1, 1), pulled toward 0 by the smoothing prior.
  const net = (positive - negative) / (evidence + PREFERENCE_SMOOTHING);
  const halfWidth = Math.min(
    MAX_USER_PREFERENCE - NEUTRAL_USER_PREFERENCE,
    NEUTRAL_USER_PREFERENCE - MIN_USER_PREFERENCE
  );
  const factor = NEUTRAL_USER_PREFERENCE + net * halfWidth;
  return Math.max(MIN_USER_PREFERENCE, Math.min(MAX_USER_PREFERENCE, factor));
}
