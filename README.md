# BackSpin Open Algorithm

**No black box.** This repository is the real BackSpin attention-exchange code:
the exact formulas that turn an AI wait state into paid attention for developers,
and into measured, fairly allocated reach for advertisers.

Website: [usebackspin.com](https://usebackspin.com)

## What is BackSpin

BackSpin is an open attention exchange for AI-native workflows. While your AI
assistant is working (the "thinking" moment in Claude Code, Codex, Cursor, VS
Code, and the browser), BackSpin shows one small, relevant discovery card, then
verifies the attention it actually received and shares the revenue with the
developer whose machine showed it.

The unit is quality-adjusted human attention seconds, not raw impressions and
not clicks. Delivery is decided by a published, multi-factor score, never by
highest bid. Every number on the board is computed server-side and public.

## Get paid while you code

Add BackSpin to your AI IDE, CLI, or browser, keep working as normal, and earn
verified attention credits during the wait states you already sit through. There
is nothing to click and nothing to run on a schedule.

```bash
# macOS / Linux
curl -fsSL https://usebackspin.com/install.sh | sh

# then sign in and wrap your AI tool
backspin login
backspin run claude     # or: backspin run codex / opencode / all
```

Prefer the editor? Install the VS Code extension and the CLI from
[usebackspin.com](https://usebackspin.com). The default split pays the developer
half of the value their verified attention generates.

## Buy attention (advertisers, companies, tool maintainers)

If you build a developer tool, an MCP server, an API, a cloud platform, a
template, a job post, a grant, or a bounty, BackSpin puts it in front of
developers at the exact moment they are between tasks and open to discovery.

You buy verified, quality-adjusted attention seconds with a CPAS bid and a
budget cap. You only pay for attention that clears the fraud filter, and your
share of voice is set by relevance and reputation, not by who spends most.

Start an open-exchange campaign at
[usebackspin.com](https://usebackspin.com).

## What is in this repository (the real formulas)

These files are copied verbatim from the BackSpin production monorepo by a sync
script, so the public formulas cannot drift from what runs in production.

| File | What it computes |
| --- | --- |
| `src/domain/scoring.ts` | AttentionScore (activity, focus, session quality, workflow relevance, trust, minus fraud risk), eligibility, and reward. |
| `src/domain/ranking.ts` | CampaignScore (six factors) plus allocation: a fair base floor, purchased share of voice, per advertiser and per category caps, and a new campaign boost. Not highest bid wins. |
| `src/domain/relevance.ts` | Category by workflow relevance multiplier. |
| `src/domain/reputation.ts` | Advertiser reputation from ratings and attention quality. |
| `src/domain/user-preference.ts` | Per category viewer sentiment multiplier. |
| `src/domain/trust.ts` | TrustRank from prior eligible and total history. |
| `src/domain/revenue-split.ts` | User, partner, and BackSpin split math. |
| `src/domain/market-price.ts` | Live CPAS clearing price from supply and demand. |
| `src/domain/display-rules.ts` | Card format chosen by wait length. |
| `src/shared/` | The formula types and economic constants the domain imports. |

## What is intentionally not here

`src/domain/fraud.ts` is a documented stub that always returns `0` (no fraud).
The fraud and anti-abuse engine is the one deliberately closed part of the
open-trust split: the methodology is public, but the exact signals and
thresholds stay private so they cannot be gamed. The stub keeps the package
compiling and reproduces production exactly for honest traffic, because
production also scores genuine attention with near zero fraud risk. Only the
abuse path differs.

The cross account farm engine, install origin hashing, and attribution token
signing are excluded for the same reason.

## Verify it yourself

```bash
npm install
npm run typecheck   # the mirror compiles standalone
```

## How this stays honest

A maintainer regenerates this package from the monorepo with `npm run sync`. The
script copies the real source, swaps in the fraud stub, and refuses to publish
if any open file imports a closed module. The mirror is never hand edited, so
"checked against the live code" stays true.

## Who builds BackSpin

BackSpin were led by **Rizaldy Primanta Putra**, former Chainstack and Edgevana Blockchain Engineer.

## License

This repository ships under two layers:

1. **This algorithm mirror is open source (MIT).** You may read, use, copy,
   modify, and distribute the formula code in `src/` under the terms in
   [LICENSE](./LICENSE). It is published so the exchange can be audited.

2. **The BackSpin platform itself is proprietary and source-available, not open
   source.** Copyright 2026 BackSpin. All rights
   reserved. The production service, the fraud and anti-abuse engine, the
   ledger, and the surrounding product are not licensed for use, copying,
   modification, distribution, or commercialization without a written license.
   Commercial inquiries: support@usebackspin.com.
