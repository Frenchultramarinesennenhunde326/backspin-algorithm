# BackSpin Open Algorithm

The **real** BackSpin attention-exchange formulas, open and verifiable. No black
box: this is exactly how a developer's AI wait turns into paid attention, and how
an advertiser's spend turns into measured, fairly-allocated reach.

> Mirror of the production code in the BackSpin monorepo. These files are copied
> **verbatim** from `apps/api/src/domain` and `packages/shared/src` by a sync
> script, so the public formulas cannot drift from what runs in production.

## What's here (the real formulas)

| File | What it computes |
| --- | --- |
| `domain/scoring.ts` | `AttentionScore = activity + focus + session_quality + workflow_relevance + trust_score − fraud_risk`, eligibility, and reward. |
| `domain/ranking.ts` | `CampaignScore` (6 factors) + allocation (base floor + share-of-voice + caps + new-campaign boost). Not highest-bid-wins. |
| `domain/relevance.ts` | Category × workflow relevance multiplier. |
| `domain/reputation.ts` | Advertiser reputation from ratings + attention quality. |
| `domain/user-preference.ts` | Per-category viewer sentiment multiplier. |
| `domain/trust.ts` | TrustRank from prior eligible/total history. |
| `domain/revenue-split.ts` | User / partner / BackSpin split math. |
| `domain/market-price.ts` | Live CPAS clearing price from supply + demand. |
| `domain/display-rules.ts` | Card format chosen by wait length. |
| `shared/` | The formula types + economic constants the domain imports. |

## What's intentionally NOT here

`domain/fraud.ts` is a **documented stub** that always returns `0` (no fraud).
The fraud / anti-abuse engine is the one deliberately-closed part of BackSpin's
open-trust split: the methodology is public, but the exact signals and
thresholds stay private so they cannot be gamed. The stub keeps the package
compiling and reproduces production **exactly for honest traffic** — production
also scores genuine attention with ~0 fraud risk, so only the abuse path differs.

Also excluded (anti-abuse infrastructure, not formulas): the cross-account farm
engine, install-origin hashing, and attribution-token signing.

## Verify it yourself

```bash
npm install
npm run typecheck    # the mirror compiles standalone
```

## How this stays honest

A maintainer regenerates this package from the monorepo with `npm run sync`
(run inside the monorepo). The script copies the real source, swaps in the fraud
stub, and refuses to publish if any open file imports a closed module. The mirror
is never hand-edited, so "checked against the live code" stays true.

## License

MIT. See [LICENSE](./LICENSE).
