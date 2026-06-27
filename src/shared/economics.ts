/**
 * Credit economics — the single source of truth for what a BackSpin reward
 * credit is worth in fiat, shared by the API, the web app, and the CLI so the
 * conversion never drifts between where it is earned, displayed, and paid out.
 *
 * The published rate is intentionally simple and linear: a fixed USD value per
 * credit. If the rate ever becomes dynamic (FX, tiered payout), keep this the
 * one place it is defined and have callers read it from here.
 */

/** USD value of a single reward credit. 1000 credits = $5.00 => $0.005/credit. */
export const USD_PER_CREDIT = 0.005;

/** Convert a credit amount to its USD value. */
export function creditsToUsd(credits: number): number {
  if (!Number.isFinite(credits) || credits <= 0) return 0;
  return credits * USD_PER_CREDIT;
}

/** Convert a USD amount to the equivalent number of credits. */
export function usdToCredits(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return usd / USD_PER_CREDIT;
}

/**
 * Format a USD value for display, e.g. 5 -> "$5.00", 0.5 -> "$0.50".
 * Uses 2 decimals by default; pass `maximumFractionDigits` to override for
 * very small fractional values.
 */
export function formatUsd(
  usd: number,
  maximumFractionDigits = 2
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.max(2, maximumFractionDigits),
  }).format(usd);
}

/**
 * Format a credit amount as "N credits = $X.XX", the canonical inline display
 * used across dashboards and the withdraw page. `creditsLabel` lets a caller
 * drop the unit word when the context already says "credits".
 */
export function creditsWithUsd(
  credits: number,
  opts: { withUnit?: boolean } = {}
): string {
  const { withUnit = true } = opts;
  const amount = credits.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const usd = formatUsd(creditsToUsd(credits));
  return withUnit ? `${amount} credits = ${usd}` : `${amount} = ${usd}`;
}

/**
 * The admin-configured platform fees applied to a payout. Percentage fees are
 * basis points (100 bps = 1%); the flat and minimum withdrawal fees are in USD
 * cents. Shared by the API (authoritative payout math) and the web app (live
 * breakdown) so a publisher sees exactly what they will be paid before
 * requesting a withdrawal.
 */
export interface PayoutFees {
  /** Platform fee on the publisher's gross revenue, in basis points. */
  publisherFeeBps: number;
  /** Percentage withdrawal fee, in basis points. */
  withdrawalFeeBps: number;
  /**
   * Minimum for the PERCENTAGE withdrawal fee, in USD cents. When a percentage
   * fee is configured (bps > 0) and the computed percentage fee falls below
   * this floor, the floor is charged instead. The flat fee is added on top of
   * the floored percentage fee, so `fee = max(pct, min) + flat`. Ignored when
   * no percentage fee is configured.
   */
  withdrawalFeeMinCents: number;
  /** Flat withdrawal fee added on top, in USD cents. */
  withdrawalFeeFlatCents: number;
}

/** The fully itemized result of applying fees to a credit payout, all in USD. */
export interface PayoutBreakdown {
  /** Gross USD value of the withdrawn credits, before any fee. */
  grossUsd: number;
  /** USD kept by BackSpin as the publisher platform fee. */
  publisherFeeUsd: number;
  /** USD taken as the percentage withdrawal fee (after the minimum floor). */
  withdrawalPctFeeUsd: number;
  /** True when the minimum floored the percentage fee above its raw value. */
  withdrawalMinApplied: boolean;
  /** USD taken as the flat withdrawal fee. */
  withdrawalFlatFeeUsd: number;
  /** Total fees withheld (publisher + withdrawal pct + flat). */
  totalFeesUsd: number;
  /** What the publisher actually receives, never negative. */
  netUsd: number;
}

/** Round a USD amount to whole cents to avoid floating-point dust in payouts. */
function roundCents(usd: number): number {
  return Math.round(usd * 100) / 100;
}

/**
 * Apply the platform fees to a credit withdrawal and return the itemized USD
 * breakdown. The publisher fee comes off the gross first; the withdrawal
 * percentage applies to the post-publisher-fee amount and is floored at the
 * configured minimum (`max(pct, min)`, only when a percentage fee is set); the
 * flat fee is added on top of that. Net never goes below zero (a fee larger
 * than the remainder simply yields a zero payout, not a negative one).
 *
 * Example: 1% percentage, $2 minimum, $0.50 flat, on a $100 withdrawal:
 * percentage = $1, floored to the $2 minimum, plus $0.50 flat = $2.50 total fee.
 */
export function computePayout(credits: number, fees: PayoutFees): PayoutBreakdown {
  const grossUsd = roundCents(creditsToUsd(credits));
  const publisherFeeUsd = roundCents(grossUsd * (fees.publisherFeeBps / 10000));
  const afterPublisher = grossUsd - publisherFeeUsd;

  // Percentage withdrawal fee, floored at the configured minimum. The minimum
  // only applies when a percentage fee is configured (bps > 0), so a 0%
  // withdrawal fee never silently charges the minimum.
  const rawPctUsd = roundCents(afterPublisher * (fees.withdrawalFeeBps / 10000));
  const minUsd = roundCents(Math.max(0, fees.withdrawalFeeMinCents) / 100);
  const withdrawalMinApplied = fees.withdrawalFeeBps > 0 && minUsd > rawPctUsd;
  const withdrawalPctFeeUsd =
    fees.withdrawalFeeBps > 0 ? Math.max(rawPctUsd, minUsd) : rawPctUsd;

  const withdrawalFlatFeeUsd = roundCents(fees.withdrawalFeeFlatCents / 100);
  const totalFeesUsd = roundCents(
    publisherFeeUsd + withdrawalPctFeeUsd + withdrawalFlatFeeUsd
  );
  const netUsd = Math.max(0, roundCents(grossUsd - totalFeesUsd));
  return {
    grossUsd,
    publisherFeeUsd,
    withdrawalPctFeeUsd,
    withdrawalMinApplied,
    withdrawalFlatFeeUsd,
    totalFeesUsd,
    netUsd,
  };
}
