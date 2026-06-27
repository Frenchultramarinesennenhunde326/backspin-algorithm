/**
 * Domain: display rules - the card format chosen by expected wait length.
 *
 * Pure business logic, zero I/O. From core-product-logic.md (Display Rules):
 *
 *   | Wait Length    | Default Card                      |
 *   | 3-5 seconds    | Text only                         |
 *   | 5-20 seconds   | Image card                        |
 *   | 20+ seconds    | Carousel                          |
 *   | 30+ seconds    | Premium discovery card or mini-demo |
 *
 * The rule is cumulative: a longer wait unlocks richer formats while still
 * permitting the simpler ones (a 30s wait can still show a text card). The
 * format ladder is intersected with what the requesting surface can actually
 * render (DiscoverySupports), so the wait length narrows richness and the
 * surface caps capability. Discovery only runs once a wait clears the
 * eligibility floor (WAIT > 3s); below that, nothing is shown.
 */

import type { DiscoverySupports } from "../shared/index.js";

/** A wait shorter than this is not eligible for discovery at all. */
export const MIN_DISCOVERY_WAIT_SECONDS = 3;
/** At or above this wait, image-tier formats unlock. */
export const IMAGE_TIER_WAIT_SECONDS = 5;
/** At or above this wait, carousel-tier formats unlock. */
export const CAROUSEL_TIER_WAIT_SECONDS = 20;
/** At or above this wait, premium / mini-demo formats unlock. */
export const PREMIUM_TIER_WAIT_SECONDS = 30;

/**
 * The formats a wait of `estimatedWaitSeconds` permits, before intersecting
 * with the surface's own capability. Cumulative by tier.
 *
 *  - wait < 3s  -> NOTHING (below the discovery eligibility floor).
 *  - 3-5s       -> text only.
 *  - 5-20s      -> text + image + gif (image tier).
 *  - 20-30s     -> + carousel.
 *  - 30s+       -> + mini-demo (premium); mini-demo rides the carousel flag.
 */
export function formatsForWait(estimatedWaitSeconds: number): DiscoverySupports {
  // Below the eligibility floor, discovery does not run at all: every format is
  // disabled, so the ranker filters out every candidate and the surface gets a
  // graceful empty batch (no card shown on a sub-floor wait). This enforces the
  // documented discovery trigger (WAIT >= 3s); the floor was previously declared
  // but never applied, so a 1s wait still served a text card.
  if (estimatedWaitSeconds < MIN_DISCOVERY_WAIT_SECONDS) {
    return { text: false, image: false, gif: false, carousel: false };
  }
  const text = true;
  const image = estimatedWaitSeconds >= IMAGE_TIER_WAIT_SECONDS;
  const gif = estimatedWaitSeconds >= IMAGE_TIER_WAIT_SECONDS;
  const carousel = estimatedWaitSeconds >= CAROUSEL_TIER_WAIT_SECONDS;
  return { text, image, gif, carousel };
}

/**
 * Effective renderable formats for a request: the wait-length ladder
 * intersected with what the surface can render. A format is allowed only when
 * both the wait permits it AND the surface supports it.
 */
export function effectiveSupports(
  estimatedWaitSeconds: number,
  surface: DiscoverySupports
): DiscoverySupports {
  const wait = formatsForWait(estimatedWaitSeconds);
  return {
    text: wait.text && surface.text,
    image: wait.image && surface.image,
    gif: wait.gif && surface.gif,
    carousel: wait.carousel && surface.carousel,
  };
}
