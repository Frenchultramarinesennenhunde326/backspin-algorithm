/**
 * Domain: open-market price (CPAS).
 *
 * The market-pricing algorithm now lives in the shared contract package
 * (`@usebackspin/shared` → `market-board.ts`) so the API and the web app
 * compute it from ONE source of truth and can never drift. This module
 * re-exports that canonical implementation under the domain's existing names
 * (so routes, the snapshot job, the seed, and tests keep importing
 * `marketPriceCpas` / `MIN_CPAS` from here), adapting only the input shape:
 * the domain passes pre-aggregated conditions (supply + bid aggregates), which
 * is what the snapshot pipeline already has on hand.
 *
 * Pure business logic, zero I/O. From economics.md (Pricing): the market price
 * is quoted as CPAS — cost per 1,000 attention-seconds — and floats with supply
 * and demand. It is a CLEARING price bounded by the top bid by construction, so
 * it is always coherent with the real bids on the board.
 */

import {
  MIN_CPAS as SHARED_MIN_CPAS,
  SUPPLY_REFERENCE as SHARED_SUPPLY_REFERENCE,
  ABUNDANT_DISCOUNT as SHARED_ABUNDANT_DISCOUNT,
} from "../shared/index.js";

/** Floor so a thin/cold market never quotes a degenerate price. */
export const MIN_CPAS = SHARED_MIN_CPAS;
/** Weighted-supply level at which the market is "balanced" (scarcity = 0.5). */
export const SUPPLY_REFERENCE = SHARED_SUPPLY_REFERENCE;
/** Abundant supply discounts the price toward this fraction of the avg bid. */
export const ABUNDANT_DISCOUNT = SHARED_ABUNDANT_DISCOUNT;

/** The market inputs the price is computed from (pre-aggregated conditions). */
export interface MarketConditions {
  /** Quality-adjusted attention supply (sum of weighted attention). */
  weightedSupply: number;
  /** Active campaigns competing for delivery (demand count). */
  activeCampaigns: number;
  /** Sum of active campaign bid weights; average bid = this / activeCampaigns. */
  totalBidWeight: number;
  /** Highest active bid. The market price can never exceed it (the ceiling). */
  maxBidWeight: number;
}

/**
 * Compute the spot market price in CPAS from pre-aggregated market conditions.
 *
 * This is the conditions-shaped adapter over the shared clearing-price model.
 * Rather than reconstruct per-campaign rows the caller no longer has, it
 * reproduces the identical lerp(floor, ceiling, scarcity) the shared module
 * uses, from the already-summed bid aggregates:
 *   - ceiling = top bid (clamped to at least the floor);
 *   - floor   = the average bid discounted for abundant supply (never below
 *               MIN_CPAS, never above the ceiling);
 *   - scarcity in (0,1] rises as weighted supply falls.
 * With no active campaigns there is no demand, so the price sits at the floor.
 */
export function marketPriceCpas(conditions: MarketConditions): number {
  const { weightedSupply, activeCampaigns, totalBidWeight, maxBidWeight } =
    conditions;
  if (activeCampaigns <= 0) return MIN_CPAS;

  const avgBid = totalBidWeight > 0 ? totalBidWeight / activeCampaigns : MIN_CPAS;

  const ceiling = Math.max(MIN_CPAS, avgBid, maxBidWeight);
  const floor = Math.min(ceiling, Math.max(MIN_CPAS, avgBid * ABUNDANT_DISCOUNT));

  const scarcity =
    SUPPLY_REFERENCE / (SUPPLY_REFERENCE + Math.max(0, weightedSupply));

  const price = floor + scarcity * (ceiling - floor);
  return round2(Math.max(MIN_CPAS, Math.min(ceiling, price)));
}

/** Round to cents; prices are quoted to 2 decimals. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
