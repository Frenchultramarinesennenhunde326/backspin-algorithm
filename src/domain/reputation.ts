/**
 * Domain: advertiser reputation from real user feedback.
 *
 * Reputation is a delivery multiplier in the CampaignScore formula
 * (domain/ranking.ts). It blends THREE signals, so every surface contributes,
 * not just the surfaces where a user can click a rating button:
 *
 *   1. Explicit ratings: users mark a shown card useful | neutral | annoying.
 *   2. Dismissals: a skip/dismiss of the shown card is a weaker negative than
 *      an explicit "annoying" vote. This is the signal a terminal (CLI) can
 *      emit with a single keypress, where there is nothing to click.
 *   3. Implicit attention quality: how much real, focused attention the
 *      campaign's cards actually earned (the scored AttentionScore of the
 *      windows where the card was shown). A card people genuinely read during a
 *      real wait earns reputation; one that is shown but never attended does
 *      not. This works on EVERY surface, including the unclickable CLI.
 *
 * Pure function, zero I/O. Smoothing dampens small samples so one annoyed vote
 * (or one low-attention window) cannot tank a new campaign, and the result is
 * clamped so reputation can never dominate or zero out the auction.
 */

/** The reactions a user can give a shown card. */
export type Rating = "useful" | "neutral" | "annoying" | "dismissed";

/** The explicit ratings a user picks (the /api/ratings surface). */
export const RATINGS: readonly Rating[] = ["useful", "neutral", "annoying"];

/** Every recordable reaction, including the implicit-ish dismiss action. */
export const REACTIONS: readonly Rating[] = [
  "useful",
  "neutral",
  "annoying",
  "dismissed",
];

/** Aggregate reaction counts for a campaign. */
export interface RatingCounts {
  useful: number;
  neutral: number;
  annoying: number;
  /** Skip/dismiss of the shown card. A weaker negative than "annoying". */
  dismissed?: number;
}

/**
 * Implicit attention quality for a campaign: the average scored attention
 * (0..1, where 0.5 is the neutral midpoint) across the windows its cards were
 * shown in, plus how many such windows exist (the confidence weight).
 */
export interface AttentionQuality {
  /** Mean attention quality in [0,1]; 0.5 is neutral. */
  avgQuality: number;
  /** Number of scored impressions backing avgQuality (confidence). */
  sampleCount: number;
}

/** Neutral baseline: a campaign with no feedback sits here. */
export const NEUTRAL_REPUTATION = 1.0;
/** Reputation floor and ceiling, so it stays a multiplier, not a kill switch. */
export const MIN_REPUTATION = 0.5;
export const MAX_REPUTATION = 1.5;

/** How strongly explicit-rating sentiment moves reputation away from neutral. */
const RATING_SENSITIVITY = 0.5;
/** Pseudo-count that smooths early ratings toward neutral. */
const RATING_SMOOTHING = 10;
/**
 * A dismissal counts as this fraction of an "annoying" vote: a skip is a softer
 * "not for me" than an explicit complaint, so it nudges reputation down gently.
 */
const DISMISS_WEIGHT = 0.5;

/** How strongly implicit attention quality moves reputation. */
const ATTENTION_SENSITIVITY = 0.4;
/** Pseudo-count smoothing implicit quality toward neutral on small samples. */
const ATTENTION_SMOOTHING = 20;
/** The neutral attention-quality midpoint (also the no-data default). */
export const NEUTRAL_ATTENTION_QUALITY = 0.5;

/**
 * Compute a campaign's reputation from its aggregate reactions and implicit
 * attention quality.
 *
 * rating sentiment = (useful - annoying - DISMISS_WEIGHT*dismissed)
 *                    / (totalReactions + RATING_SMOOTHING)
 *   so neutral votes and dismissals dilute confidence, a few votes stay near
 *   neutral, and dismissals pull down at half the weight of "annoying".
 *
 * attention sentiment = (avgQuality - 0.5) * sampleCount/(sampleCount + SMOOTH)
 *   so a campaign with lots of genuinely-attended impressions earns reputation
 *   even with zero explicit ratings (the CLI case), while a thin sample stays
 *   close to neutral.
 *
 * reputation = NEUTRAL + RATING_SENSITIVITY*ratingNet + ATTENTION_SENSITIVITY*qualityNet,
 *   clamped to [MIN_REPUTATION, MAX_REPUTATION].
 */
export function computeReputation(
  counts: RatingCounts,
  attention: AttentionQuality = {
    avgQuality: NEUTRAL_ATTENTION_QUALITY,
    sampleCount: 0,
  }
): number {
  const dismissed = counts.dismissed ?? 0;
  const totalReactions =
    counts.useful + counts.neutral + counts.annoying + dismissed;

  let reputation = NEUTRAL_REPUTATION;

  if (totalReactions > 0) {
    const ratingNet =
      (counts.useful - counts.annoying - DISMISS_WEIGHT * dismissed) /
      (totalReactions + RATING_SMOOTHING);
    reputation += RATING_SENSITIVITY * ratingNet;
  }

  if (attention.sampleCount > 0) {
    const confidence =
      attention.sampleCount / (attention.sampleCount + ATTENTION_SMOOTHING);
    const qualityNet =
      (attention.avgQuality - NEUTRAL_ATTENTION_QUALITY) * confidence;
    reputation += ATTENTION_SENSITIVITY * qualityNet;
  }

  return Math.max(MIN_REPUTATION, Math.min(MAX_REPUTATION, reputation));
}

/** Whether a value is a valid explicit rating (useful | neutral | annoying). */
export function isRating(value: string): value is Rating {
  return (RATINGS as readonly string[]).includes(value);
}

/** Whether a value is any recordable reaction (incl. dismissed). */
export function isReaction(value: string): value is Rating {
  return (REACTIONS as readonly string[]).includes(value);
}
