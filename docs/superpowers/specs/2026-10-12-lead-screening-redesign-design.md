# Lead screening, decision memory, and earned automation — design

Date: 2026-10-12. Status: **approved by the owner on 2026-10-12 for implementation planning.** No code, configuration or production data had been changed when it was approved. Production migration, deployment, configuration changes and message sending still each need the owner's explicit authorization (§10).

Evidence base: the code at `main` (`f792a6d`; identical to this branch apart from one AGENTS.md line) and a read-only snapshot of production taken through the admin/ingest GET endpoints on 2026-10-12 (kept locally at `/tmp/yangmao-recon/data/`, not committed).

---

## 1. Why this exists

The owner reviews every perk on ai-yangmao.com by hand. The goal of the collection workflow is to put only fresh, genuine, in-scope perks in front of the owner, and over time to put fewer and fewer things in front of the owner at all.

That is not happening. The owner keeps seeing:

- perks they already approved, reworded or scraped from another source (e.g. 8vk3 Qoder CN Qwen3.8-Flash 免费期延长, at2u WorkBuddy 大学生认证送 1,000 积分, 智谱新用户注册送 2000 万 Tokens);
- the same kinds of community posts they have rejected many times (relay stations, account pools, non-AI deals, personal giveaways);
- a backlog that sits in "system review" and never reaches a state where either the system or the owner can act;
- time-sensitive perks, such as a reset card handed out that day, arriving so late that they're nearly expired by the time the owner reviews them.

The owner's own statement of what the agents must handle going forward:

1. **Automatic lead capture and deduplication.** Push only fresh, genuinely new leads; filter out anything already published.
2. **Self-learning and precision.** Learn from past rejections so future leads are more accurate. Community-sourced leads must be verified against official sources by the agents before they are pushed.
3. **Automated approvals.** Gradually reduce manual approvals as agents learn each platform's announcement locations, publishing patterns, and update cycles.

Three things are critical throughout: **deduplication, lead precision, and self-learning from the owner's past decisions and platform-specific patterns.** The measure of success is that the owner's manual review workload shrinks over time.

The owner's further requirement on time sensitivity (2026-10-12): a perk must never reach the owner so late that it is nearly expired by review time. An urgent one-time perk, such as a reset card handed out the same day, goes straight to the very front of the review queue the moment it arrives, with a notification, and is prioritized for fast approval. **Review speed must scale with how time-sensitive the perk is.**

## 2. What the production data shows (2026-10-12)

| Fact | Number |
|---|---|
| Offers | 239 approved, 184 rejected, 101 platforms; max 32 records on one platform, 90% of platforms have ≤10 |
| Leads | 435 rejected, 102 linked, 105 in review, 0 new; ~49 new leads/day (642 over 13 days) |
| Owner-visible backlog | 77 identity tasks (all `manual`) + 103 lead-review items |
| The 77 identity tasks | only 58 distinct perks (same perk queued up to 4×); **48 have a near-identical title (≥0.95 bigram similarity) to an existing record on the same platform**, 21 are close variants, 8 look genuinely new |
| The 103 lead-review items | 101 from linux.do; 83 in `retry`, 17 never processed, 3 `manual`; many retries 30–43 h overdue |
| Why they retry | 28 search-service cooldown, 19 issuing platform unconfirmed, 14 "basis not in official text", 4 models exhausted; several unprocessed ones failed only because the free model returned malformed JSON |
| What they are | overwhelmingly categories the owner rejects: relay API stations / account pools / 公益站 (【富可敌国】…, NEXA, Krill, RelayFor, 404API), non-AI consumer deals (霸王茶姬, 美团单车, QQ 音乐, 支付宝, 农行), user-to-user giveaways ("GLM 体验卡自取", 抽 Premium 名额). "臭鸡蛋 / 发粮" posts are mixed: some are personal leftovers, some may be issuer giveaways (see next row) |
| Source yield | linux.do: 31 linked vs 280 rejected (~1 in 10). AIHOT: 52 linked vs 61 rejected (~1 in 2) |
| Rejection reasons and who made them | 380 of 435 lead rejections have **no recorded reason and no recorded actor**. They mix owner dismissals made before 2026-10-09 (when the dismiss button stored no reason) with automatic rejections by the pipeline's triage model. Some look like real perks the model got wrong, e.g. lead 5453 "Zcode发粮了，速领3亿tokens" (2026-10-10) and 1421 "上海人工智能实验室免费发 5亿Token". The 102 linked leads were also linked by the pipeline, not the owner. Offer rejections by code: other 63, paid_bundle 51, duplicate 35, wrong_type 22, wrong_platform 19, not_ai 16, vague 13, expired 12 |
| Review effort | 1,756 reviews: only 233 clean approvals, **1,314 edits** (requirements 536, valueText 453, evidence 347, valuation 256, steps 200, creditValidity 194, title 149), 209 rejects |
| Auto-publish | per-source clean-approve rate is ~5–20%, so the "5 clean approvals in a row" rule has never fired |
| Resource use (2026-10-12, at ~14:20 UTC) | D1 5,526,272 rows read today. That is over the 5M/day **free-plan** figure, but the owner confirmed the account is on Workers Paid: D1 has no daily limit there, and 25 billion rows read/month are included (Cloudflare D1 pricing page, checked 2026-10-12). The site's own health monitor still measures against the free-plan 5M/day threshold. Model use 11.1M tokens today; paid fallback spend ¥6.30 of the ¥10 monthly cap |
| linux.do in detail | 31 leads marked "linked", but 8 of them are wrong links: relay-station posts attached to unrelated official perks. Linux.do was the first lead for about 7 perks the owner approved. At least 4 of those came from places no monitored official source covered: DeepSeek Harness 6 元 (an in-app gift the owner tested), GLM Coding Plan 7天体验卡 (a share-link page), 基元律动 and Qoder CN (both platforms were added because of the lead). Three title rules (【富可敌国】 tag; relay / account-pool / 公益站 wording; everyday non-AI deals) would have removed 94 of the 280 rejected linux.do leads and 36 of the 101 stuck ones, without losing a single genuine perk |

## 3. Root causes (from the code)

These are the mechanisms behind the numbers above. All references are to `main`.

1. **Enforce mode switched off the older duplicate checks.** With `IDENTITY_MODE=enforce` and `IDENTITY_CANARY_PLATFORMS=*` (live since 2026-10-11), `/api/ingest/offers` hands every offer to `adaptLegacyOffer` and `continue`s (`src/worker/index.ts:296`). `findDuplicate`, `crossPlatformDuplicate`, the "duplicate of a rejected record → skip" rule and the extractor's `sameAs` merge no longer run.
2. **The resolver can almost never say "same".** `compareCandidate` returns SAME only on a human confirmation or an identical, quote-grounded `occurrenceAnchor` on both sides (`src/shared/identity/compare.ts:45`). The 423 historical entities were backfilled with all-unknown facts (`scripts/identity/backfill.ts:49`), and the extraction prompt tells the model to omit `identityFacts` when unsure (`pipeline/llm.ts:354`). With unknown product/mechanism the resolver does not even retrieve history (`src/worker/identity/service.ts:402`) and returns `needs_identity_review`.
3. **The only automatic memory is an exact copy.** `findReviewedLegacy` needs identical evidence URL, `valueText`, and excerpts (`src/worker/identity/reviewed-legacy.ts`). Any rewording or new source misses.
4. **One task per scrape.** Identity tasks are keyed by candidate ID (`identity:{candidateId}`, `service.ts:367`), so every re-scrape of the same perk opens another task.
5. **The identity agent is blind and overruled.** It sees each existing entity as `{id, platformId, revision, approvedVersionId, terms}` — no title, amount, excerpt, or URL (`src/shared/identity/types.ts:46`) — and its verdict is discarded unless the deterministic comparator already agreed (`pipeline/identity-review.ts:40`). It handles at most 4 tasks inside a 90-second slot at the very end of each run (`pipeline/run.ts:454`).
6. **Rejections cannot generalize.**
   - Lead closures are stored as reason `other`, scope `observation_only` tied to one URL + exact text hash + candidate ID (`src/worker/identity/lead-closure.ts:19`).
   - Offer rejections default to `exact_version` scope (`service.ts:646`), which a reworded lead can never reach.
   - The identity-task UI always sends `reasonCode:'other'` (`web/src/app.js:1889`).
   - The extractor sees only the 10 most recent corrections.
7. **Community verification has no exit.** Identity preparation requires every source to be a verified official page before it will compare history; community sources never qualify, so `pipeline/identity-workflow.ts:36` skips them and they retry every ~6 h indefinitely. Lead review processes 4 items per run, shares a search quota that is often in cooldown, and spends that quota on posts that are obviously out of scope.
8. **Lead intake dedupes only on the exact raw URL** (`leads_url_uq`), so every repost costs a full model extraction.
9. **Auto-publish cannot be earned.** It needs 5 consecutive unedited approvals per source; with a ~75% edit rate this never happens.
10. **Nothing is ordered by urgency from start to finish.**
    - The owner's queue is sorted by discovery time (`src/worker/admin.ts:145`, an owner decision of 2026-10-03 so new items don't reshuffle ones already looked at).
    - Review reminders go out hourly, at most 10 per batch (`docs/operations.md`).
    - Lead discovery runs hourly, but a lead that needs verification then waits behind backoffs of hours regardless of its deadline.
    - Identity preparation has a 72 h / 7 d priority (`src/worker/identity/preparation.ts`), but it only orders the system's own work, not what the owner sees.

    A same-day reset card can therefore spend hours or days in system states and then sit behind older standing perks.

The pattern behind all ten: every iteration added a guard that routes uncertainty to the owner, and none added a trusted way for the system to conclude "this is the same as X" or "this is the kind of thing the owner rejects". The fix is not another guard layer.

## 4. Goals, non-goals, anti-goals

### Goals

- **G1 — Dedupe.** A lead or candidate about something already published, already pending, or already rejected never reaches the owner as a new item.
- **G2 — Precision.** Categories the owner consistently rejects are closed automatically. Community leads reach the owner only after an official source confirms them.
- **G3 — Self-learning.** Every owner decision (approve, reject with reason, edit) becomes reusable memory. Per-platform knowledge (where announcements appear, recurring perks, cadence, pitfalls) is maintained by agents, not by hand.
- **G4 — Earned automation.** Auto-publish is unlocked per platform × source when measured agreement with the owner is high, and revoked automatically when the owner corrects it.
- **G5 — No dead states.** Every item always has a current owner (system or human) and a due time. Nothing waits indefinitely.
- **G6 — Speed scales with urgency.** The more time-sensitive a perk is, the faster it moves through the system and the higher it sits in the owner's queue. Urgent one-time perks reach the owner at the front of the queue with an immediate notification and everything needed for a one-step approval (§6.12).

Targets (my call; to be revisited after calibration in §7):

| Metric | Target |
|---|---|
| Items needing owner action per week | down ≥70% within 4 weeks of auto-close going live |
| Duplicates reaching the owner (owner marks "duplicate") | ≤2% of items shown |
| Undo rate on auto-closed items | ≤3% |
| Time from discovery to the owner, by urgency tier (§6.12) | P0 ≤30 min, P1 ≤2 h, P2 ≤24 h, P3 ≤72 h |
| Perks that expire while in a system-owned state | 0 |
| Oldest item in any system-owned state | never past its tier target |

### Non-goals

- Changing what counts as a perk. `docs/data-contract.md`, `pipeline/learned-rules.md` and `AGENTS.md` keep defining scope.
- Rewriting the public site, the public data model, or the valuation workflow. Valuation stays owner-reviewed data.
- Removing the identity tables. They remain the system of record for entities, versions, and decisions; this design changes how verdicts get into them.
- Retroactively un-publishing or re-reviewing approved perks.

### Anti-goals (failure even if everything "works")

- A wrong perk is published automatically and the owner finds out from a user.
- A genuinely new perk — especially a new round of a recurring perk — is silently closed as a duplicate with no way to notice.
- The owner cannot see why the system did something, or cannot undo it in one click.
- The redesign adds another conservative gate that again routes everything to the owner.
- Model spend grows without a visible cap.

## 5. Decisions already made by the owner

- **Auto-close is allowed.** When the agent is confident a lead is already published or matches something the owner rejected, it may close it without asking, provided the owner gets a daily list of what was closed and can undo any of it.
- Community leads are verified against official sources by agents before they are pushed.
- Manual approvals should be reduced gradually as agents learn platform patterns.
- **Review speed scales with time sensitivity.** Urgent one-time perks go to the very front of the queue immediately, with a notification, and are prioritized for fast approval. A perk must not reach the owner when it is already nearly expired.
- **Model budget:** about $10/month; try OpenRouter free models first. The OpenRouter account already holds $20+ of purchased credit.
- The approach in §6 is accepted in principle; nothing is built until this document is approved.

## 6. Design

### 6.1 Flow

```
collect (unchanged sources)
  │
  ▼
Gate 0  Intake fingerprint (deterministic, no model; URL key in the Worker, similarity in the pipeline)
  │      already-decided URL / near-identical repost → attach + close, logged
  ▼
Gate 1  Screener agent (one model call, full same-platform history + rejection memory)
  │
  ├─ duplicate of published / pending ──────► link + close (auto)        ┐
  ├─ duplicate of rejected / matches a rule ► close with category (auto) ├─► daily digest, one-click undo
  ├─ not a perk / out of scope ─────────────► close with category (auto) ┘
  ├─ change to a published perk ────────────► update proposal (owner, as today)
  ├─ unsure ────────────────────────────────► owner queue, best match pre-selected
  └─ new candidate
        │
        ▼
     Verifier agent (official source; platform profile channels first, then search; time-boxed)
        ├─ confirmed ──► draft ──► Approval gate: auto-publish if the scope has earned it, else owner
        ├─ contradicted ──► close (auto, digest)
        └─ not found in time ──► P0/P1: to owner, labelled 「未核实」
                                 P2/P3: parked (digest), expires after 14 days

Learning loop (after every owner decision or undo):
  decision memory · rejection rules · platform profiles · agreement ledger

Urgency (every stage, §6.12): tier P0–P3 set at Gate 0, refined by the Screener;
  P0/P1 are processed first, verified on a short clock, and land at the top of the
  owner's queue — P0 with an immediate Telegram message.
```

For **community leads**, the Screener runs on the lead text (title + fetched page) **before** extraction. Most noise is closed before any extraction or search is spent on it. For **official-page candidates** (source monitoring), extraction runs first as today, then the Screener checks each extracted candidate against the platform's history.

### 6.2 Gate 0 — intake fingerprint (deterministic)

Runs before any model call, in two places:

- the URL checks run in the Worker at `POST /api/ingest/leads`, as an indexed lookup on the normalized key;
- the similarity checks run in the pipeline against the per-run memory snapshot (§6.10).

Rules:

- **URL normalization before uniqueness.** Reuse `normUrl` (tracking params, `www`, twitter→x) and add per-site canonical keys where obvious (linux.do topic ID ignoring slug/post number, X status ID). Store the normalized key next to the raw URL; uniqueness uses the key.
- **Already-decided URL.** If the normalized URL matches a lead already linked or rejected, or an offer's evidence URL, record the new sighting against that decision and close. No model call.
- **Near-identical repost of a rejected lead.** Same origin family and title+opening-text bigram similarity ≥0.9 with a lead whose rejection is **authoritative** (§6.5.1) in the last 90 days → close as "same as rejected lead #N". Reposts of leads linked to an offer → link to the same offer (the offer's own review decision is the owner's).
- **Near-identical official candidate.** Same platform, title similarity ≥0.95, equivalent `valueText`, claim window inside the existing record's window, and the record is **not** a reset/occurrence-type perk → attach as evidence to the existing entity with no task. Anything else goes to the Screener.
- **Urgency pre-classification.** Gate 0 assigns a provisional tier (§6.12) from the claim deadline and deterministic wording signals, so P0/P1 subjects are screened and verified first in the same run.

Gate 0 is deliberately narrow. It only removes the obvious copies cheaply; judgment belongs to the Screener. Every Gate 0 closure is a logged decision that appears in the digest and can be undone like any other.

### 6.3 Gate 1 — the Screener agent

**What it sees** (assembled in the pipeline from the per-run memory snapshot, §6.10):

- The subject: title, fetched text (truncated with a flag), URL, origin, extracted fields if any.
- **All records for the candidate platform(s)**: approved, pending, rejected and ended, each with title, valueText, type, claim window, evidence URL, the benefit excerpt, decision, and reason category. History is small (max 32/platform today); cap at 60 per platform by similarity and recency, and say so when capped.
- For leads whose platform is unknown: candidate platforms from `platformMentioned`, plus the top 20 cross-platform matches by similarity across all offers and decided leads.
- **Rejection memory**: the 10–15 most similar rejected leads/offers with their category, plus all active rejection rules (§6.5).
- The platform profile (§6.6).
- A condensed inclusion policy (from the data contract and learned rules).
- Similarity scores from the legacy heuristics (`findDuplicate`, `sameEvidenceBenefit`, etc.) as hints, not decisions.

**What it returns** (strict schema, validated server-side):

```ts
{
  verdict: 'duplicate_published' | 'duplicate_pending' | 'duplicate_rejected' | 'rejected_by_rule'
         | 'not_a_perk' | 'update_to_published' | 'new_candidate' | 'unsure';
  matchId: string | null;        // must be one of the supplied record IDs
  ruleId: string | null;         // must be an active rule ID
  reasonCategory: ReasonCategory | null;
  occurrenceCheck: string | null; // required whenever matchId refers to a recurring/reset perk: why this is the same round
  confidence: number;            // 0..1
  evidenceQuote: string;         // verbatim from the subject text
  explanation: string;           // one short Chinese sentence, shown in the digest
  urgency: {                     // §6.12
    tier: 'P0' | 'P1' | 'P2' | 'P3';
    deadline: string | null;     // ISO with timezone, only if stated or derivable from the text
    signals: Array<'deadline' | 'same_day_one_time' | 'quantity_limited' | 'reset_event' | 'limited_time_unknown_date'>;
    quote: string | null;        // verbatim; required for P0 and P1
  };
}
```

`ReasonCategory` starts as: `relay_station`, `account_pool`, `non_ai`, `personal_giveaway`, `paid_bundle`, `ordinary_discount`, `model_news_only`, `expired`, `duplicate`, `wrong_platform`, `unverifiable`, `other`. Categories can be added; existing `reason_code` values map onto them.

**Validation before anything is applied:** `matchId` exists and is on the subject's platform (or a supplied cross-platform candidate); `evidenceQuote` appears verbatim in the subject text; the subject has not changed since the context was built; for recurring/reset perks, `occurrenceCheck` is present and the subject's dates do not fall outside the matched round. A failed validation turns the verdict into `unsure`. A P0/P1 urgency claim without a verbatim `urgency.quote` drops to the tier the deterministic signals support. An `unsure` P0/P1 subject still goes to the owner at its urgency position.

**What it is allowed to do:**

| Verdict (confidence ≥ close threshold) | Action |
|---|---|
| `duplicate_published`, `duplicate_pending` | Link the lead / attach the candidate as evidence to the matched entity; close any identity task for it |
| `duplicate_rejected`, `rejected_by_rule`, `not_a_perk` | Close with the reason category and a reference to the precedent or rule |
| `update_to_published` | Create the update proposal through the existing terms-change path (owner decides) |
| `new_candidate` (confidence ≥ its own "new" threshold) | Hand to the Verifier. Once the Verifier confirms it (official sources) or for official-page candidates directly, **create a new entity and a pending draft** through a server path that records actor `agent:screener` (the same effect as an owner answering "new" on an identity task today). The draft still goes to the owner for approval unless §6.7 has unlocked its scope |
| `unsure`, or any verdict below threshold | Owner queue, showing the Screener's best match with one-click "same as X / new / reject: category" |

It may never approve or publish (except through §6.7), merge historical records, delete anything, or change an approved record. Creating a pending draft is not publishing.

"Close" and "new" use separately calibrated thresholds (§7). A wrong "new" puts a duplicate draft in front of the owner, who rejects it as `duplicate`. That rejection is counted against the ≤2% duplicate target and becomes a negative example.

**Model and budget (owner decision, 2026-10-12): about $10/month, try OpenRouter's free models first.**

- **Volume.** The Screener is one focused call with a small output, separate from extraction. Each call carries ~5–10K input tokens; daily call counts are in the table below.
- **Free-request quota.** OpenRouter's free models allow 20 requests/minute, and 50 requests/day until the account has purchased at least $10 of credit; after that, 1,000/day (OpenRouter limits page, checked 2026-10-12). The owner's account already holds a purchased balance of $20+, so the 1,000/day tier applies and no top-up is needed. The quota is per account, shared with every other free-model call: extraction's backup use and the valuation and lessons workflows.
- **Is 1,000/day enough?** Yes, with about 2.5–4× headroom:

  | Work | Calls/day (estimate) |
  |---|---|
  | Lead screening (~49 leads/day, peak 121) | 50–120 |
  | Official-candidate screening, batched per changed page (28 changed pages in the last full run × 4 runs/day; Gate 0 removes some first) | ~110 |
  | Verifier (~10–20 new candidates/day, several attempts each) | 30–60 |
  | JSON repair retries (~10%) | 20–30 |
  | **Steady state** | **~210–260, ~350–400 on a heavy day** |
  | One-time backfill and calibration (380 re-screens + 182 backlog + up to 3 models × calibration set) | ~2,000–2,500 total, spread over ~5 days |

- **Daily allocation, enforced by the budget ledger.**
  - 200 requests/day are reserved for P0/P1 urgent work (§6.12).
  - Non-urgent screening stops at 800, which keeps the reserve free.
  - Backfill and calibration take at most 400/day and pause whenever urgent work is waiting.
  - The 20/minute limit is respected by pacing (≤15/minute).
  - Free models' upstream providers also return 429s at busy times: 4 of today's stuck lead reviews were "models exhausted". In that case a P0 item may use the paid fallback; other items wait.
- **Pinned models, not the router.** `openrouter/free` sends each request to whichever free model it picks, and OpenRouter doesn't document how it chooses. Thresholds calibrated on one model don't carry over to another, so:
  - the Screener uses a ranked list of 1–3 **pinned `:free` models**, chosen by measuring them in shadow mode on the calibration set (§7);
  - `openrouter/free` and Gemini are last-resort fallbacks;
  - every verdict records the model that actually answered;
  - **only verdicts from a calibrated model may auto-close or create drafts.** Verdicts from any other model are downgraded to `suggest`.
- **Unreliable output.** Free models sometimes return malformed JSON. One repair retry with the validation error is allowed; after that the verdict becomes `unsure` or waits with a due time.
- **Model churn.** Free models get withdrawn (a pinned free model returned 404 on 2026-10-07). If every calibrated model is unavailable, screening falls back to `suggest` and the health page and digest say so. Adding a replacement model requires recalibration in shadow mode first.
- **Paid fallback.** The ~$10/month budget is a separate ledger line. It pays for:
  - P0 items when no free calibrated model is available (§6.12);
  - a calibrated low-cost paid model if no free model reaches the precision bar in §7 (OpenRouter paid models or DeepSeek, both already reachable).

  Today's ¥10 cap for extraction is unchanged.

**Fallback.** If no model is available, subjects wait with a due time set by their urgency tier. Past due, they go to the owner queue, labelled "screening unavailable", at their urgency position. P0 items try the paid fallback first and never wait more than the P0 target (§6.12). The system never auto-closes without a validated model verdict, except for Gate 0 copies.

### 6.4 Verifier agent — community → official

Reuses the existing lead-review and official-review machinery (`pipeline/lead-review.ts`, `pipeline/official-review.ts`, Exa search), with these changes:

- **Runs only on Screener `new_candidate` (and `update_to_published` from community sources).** Noise never reaches search, so the shared search quota goes to real candidates.
- **Platform channels first.** Read the platform profile's known announcement, pricing, docs and X pages before falling back to web search.
- **Time-boxed by urgency tier (§6.12).** P0: verify immediately in the same run, retry through the urgent lane; P1: every 2 h; P2/P3: up to 3 attempts within 48 h. In every tier the verification window never exceeds 25% of the time left before the deadline.
  - **Confirmed** → draft with official evidence tier.
  - **Contradicted** → close with category `unverifiable`, shown in the digest.
  - **Not found in time, P0/P1** → **to the owner anyway**, at its urgency position, labelled 「未核实」 with what was found (candidate official pages and quotes). P0 goes after 1 hour from discovery, P1 after 12 hours. Parking a same-day perk would make it worthless. The owner can verify, mark it 实测, or reject it.
  - **Not found in time, P2/P3** → **parked**: kept out of the main queue, listed in the digest with "check it myself", auto-closed after 14 days (or at its deadline, if sooner) with reason `unverified_expired`. If the same perk later appears with an official source, Gate 0 / the Screener links it to the parked record and reopens it.
- **Platform not on the whitelist.** If the verified issuer isn't an approved platform, the item goes to the owner once as "new platform: admit?" (platform admission stays manual, per AGENTS.md). It does not retry indefinitely.
- **Dedicated time slice** in each run (not the leftover 90 s), and a watchdog that reports the oldest item per state in `/api/admin/health`.

### 6.5 Rejection memory and rules (learning from rejections)

#### 6.5.1 Whose decisions count

The owner authorized auto-closing items that match **something the owner rejected**. So only owner decisions are authoritative precedents; decisions made by models are hints.

| Source of a past decision | Authority |
|---|---|
| Admin or named reviewer actions in the admin UI or API — including agent review sessions the owner ran with the repo's `yangmao-review` skill, which require the owner's confirmation before writing | **Authoritative** |
| Offer approvals and rejections (every offer decision today is human) | **Authoritative** |
| Owner confirmations made during backlog cleanup (§7) and in the digest (including undo) | **Authoritative** |
| Pipeline triage rejections ("模型判断不是 AI 羊毛"), automatic links, identity model suggestions, Screener verdicts | **Hint only**: shown to the Screener as context, never sufficient on its own for Gate 0 closure, auto-close, or rule proposals |
| Unattributable (the 380 reason-less rejected leads) | **Hint only** until re-screened (below) |

**Attribution.** Each historical decision gets an `actor_kind` (`owner` / `model` / `unknown`), derived from `review_decisions.actor`, `reviews.reviewer`, the `[研判]` marker the pipeline writes into `leads.raw`, and `leads.resolution`. Every new decision records it explicitly.

**Re-screening the 380.**
- The one-time backfill re-screens the 380 reason-less rejected leads instead of only labelling them.
- Where the Screener agrees they're out of scope, they stay rejected and get an inferred category, but remain hints.
- Where it thinks they may have been real perks (e.g. lead 5453 Zcode 3亿 tokens), they're listed once in the backlog-cleanup screen for the owner to decide.
- None of this changes a lead's existing status unless the owner acts.

**What the Screener can still auto-close.**
- Precedent memory therefore starts with about 55 reasoned lead rejections, 184 offer rejections, the owner-confirmed backlog, and the backfill spot-check.
- Model-made rejections don't need to be precedents for auto-close to work. Out-of-scope categories are closed through **owner-approved rules**, which are seeded from the history and approved in one sitting.

#### 6.5.2 Memory layers

Two layers, both stored in D1 so the pipeline reads them at run time:

1. **Precedent memory.** Every rejected lead and offer carries a reason category, recorded by the owner or inferred by an agent and marked as inferred, plus its `actor_kind`. The Screener retrieves the most similar precedents by text similarity; only authoritative ones can be cited as `matchId` for an auto-close. This replaces the unreachable `observation_only` / `exact_version` scopes for screening; existing `review_decisions` rows stay untouched for audit.
2. **Rules.** Generalized, plain-language patterns, e.g. "linux.do posts promoting third-party relay API stations (中转站 / 号池 / 公益站) are out of scope." Each rule has a scope (global / platform / source / origin), category, description, example references, status (`proposed` / `active` / `retired`), author (owner / agent), hit count, and override count.
   - An agent proposes a rule when it sees ≥3 authoritative rejections in the same category and pattern within 60 days.
   - Proposed rules appear in the digest for one-click accept or decline. Owner-written rules are active immediately.
   - A rule is automatically retired when its override rate exceeds 10% over at least 10 hits.

**Capturing reasons going forward.** Every reject action — lead card, offer card, identity task card — requires one tap on a reason category, with optional free text. This replaces the hard-coded `reasonCode:'other'`. It's a small UI change, and without it learning stays slow.

**Backfilling reasons.**
- A one-time agent pass re-screens the 380 reason-less rejected leads (§6.5.1) and labels them, plus any offers rejected as `other`, with an inferred category and a one-line justification.
- The owner spot-checks a random sample of 30 in one screen, alongside the "may have been real" list.
- The pass also seeds initial rule proposals for the owner to approve. From the snapshot, the obvious first three are:
  - relay stations, account pools and 公益站;
  - non-AI consumer deals;
  - user-to-user giveaways on linux.do, kept distinct from issuer giveaways announced there.

### 6.6 Platform profiles (learning platform patterns)

One profile per platform in D1 (`platform_profiles`: JSON document + revision), plus an append-only `platform_profile_events` log in which every entry cites the decision, offer, or source that taught it.

A profile holds:

- **Official channels:** announcement / pricing / docs / changelog URLs, RSS, X handles, WeChat. Each is counted by how often approved perks' evidence actually came from it.
- **Perk patterns:** recurring perks (monthly resets, signup grants, daily check-ins), regional splits (e.g. Qoder CN vs International are separate perks), naming conventions, known pitfalls ("7天体验卡 is one 7-day card, not seven cards").
- **Cadence:** observed interval between new perks per source, and the last change seen.
- **Accuracy:** per-field edit rate for this platform's drafts.

**Who maintains it:** a Profiler step runs after each owner decision or edit on the platform and appends observations, with a weekly consolidation pass. The owner can view and edit any profile in the admin UI.

**Seed:** at migration, `pipeline/platform-notes.md` entries are imported, keeping their dates. After that the D1 profile is the live source and the markdown file is frozen as history. This changes the AGENTS.md rule that platform facts live in `platform-notes.md`, so that rule must be updated at the same time.

**Used by:**

- the Screener (context);
- the Verifier (official channels to read first);
- extraction (platform pitfalls, plus this platform's recent field corrections instead of the global last 10);
- collection scheduling: suggest polling frequency from cadence, and propose a new official source when a verified perk's official URL isn't a registered source (adding the source stays a one-click owner confirmation).

### 6.7 Earned automation (fewer approvals over time)

The `cleanStreak ≥ 5` rule is replaced by an **agreement ledger**.

- **Predictions.** For every draft that reaches the owner, the agent records its predicted decision (approve / reject + category) and predicted values for the material fields. When the owner decides, the ledger records whether the decision matched and which material fields were edited.
  - **Material fields:** type, valueText amount, requirements / audience, claim window, creditValidity, models.
  - **Not material:** steps wording, tags, reviewMemo.
  - **Excluded:** valuation, which stays owner-reviewed and never blocks automation by itself.
- **Scope:** platform × source for official sources; platform × origin for verified community leads. Updates to already-approved perks form separate scopes, unlocked later.
- **Unlock:**
  - The system proposes auto-publish for a scope once ≥93% of its last ≥15 decisions agree (decision and material fields) and none was a "wrong approve" (agent predicted approve, owner rejected).
  - The owner confirms each unlock with one click in the digest.
- **While unlocked:**
  - Drafts in the scope that pass the existing hard gates publish automatically. They are flagged "auto" and listed in the digest with "pull back".
  - Any owner correction on an auto-published item demotes the scope to manual and restarts its count.
- **Approval path.** Today no agent can approve: identity approvals accept only the admin or reviewer role, and the old auto-publish check never runs in enforce mode. Phase 3 therefore adds a narrowly scoped `agent:publisher` actor.
  - It can approve only an `initial` task whose scope is unlocked and whose draft passes the publication checks.
  - It goes through the same `decideTask` path as the owner, with the scope ID recorded as basis.
  - It can never approve terms changes, evidence reopenings, or identity conflicts.
  - The owner sanctioned this in principle (goal 3); each scope is still confirmed individually.
- **Valuation on auto-published perks.** The perk goes live with the valuation the ingest step already computes, marked as a **system estimate** (not owner-reviewed) on the admin card and in the digest. The owner reviews valuations at their own pace. An unreviewed estimate never blocks publication and is never shown as owner-confirmed.
- **Public announcements.** Auto-published perks are **held out of push channels** (Feishu group digest, hourly urgent push, RSS) for 24 hours, so the owner's daily digest comes first. Pulling a perk back within that window means it was never announced. Perks ending within 24 hours are the exception: they go into the urgent push only if their scope has had zero corrections in its last 15 auto-publishes; otherwise they wait for the owner.
- **Never automatic** (unchanged hard limits):
  - unadmitted platforms;
  - staff-account sources;
  - community-only evidence;
  - membership requirements;
  - missing official excerpts for benefit / eligibility / validity;
  - `tested` tier.

Because 75% of reviews today are edits, earned automation depends on extraction getting better. Feeding per-platform corrections into extraction (§6.6) is the main lever. The per-field edit rate in each profile shows whether it's working.

### 6.8 Owner-facing surfaces

- **Daily digest** — in the admin UI (a new "系统已处理" section) and as a section of the existing Hermes Telegram 09:00 digest. It contains:
  - counts by outcome;
  - every auto-closed item with its match / rule, one-line reason, and **Undo**;
  - parked-unverified items;
  - proposed rules;
  - proposed auto-publish scopes;
  - auto-published items with "pull back".
  - During the first two weeks of auto-close, the digest lists every closure. After that it lists all closures but flags a random 10% for spot-check.
- **Undo:** one click. It reopens the subject into the owner queue with the Screener's reasoning attached and records an override, which becomes a negative example for precedents, rules, and automation scopes. The original verdict and the override are both kept.
- **Owner queue order:**
  - P0, then P1, then P2, then P3 (§6.12). Within a tier, the item whose deadline leaves the least time comes first.
  - P0 and P1 sit in a pinned 「紧急」 section at the top of the review page, with live countdowns.
  - P3 keeps discovery order, so non-urgent items still don't reshuffle.
- **Owner queue cards:** every item shows its urgency tier and countdown, and the Screener's best match and confidence, with one-click "same as X", "new", or "reject: category".
- **Immediate notification for P0:** a Telegram message within minutes, at any hour, with everything needed to decide; the owner can approve by replying 「通过 <短码>」 (§6.12).
- **Health:** oldest item age per state, Screener / Verifier throughput, undo rate, and model spend, in `/api/admin/health` and the admin health page.

### 6.9 Changes to the existing identity machinery

- Screener duplicate verdicts reach the identity tables through a **new server path**:
  - attach the candidate to the matched entity as `evidence_only`;
  - write a `review_decisions` row with action `same`, actor `agent:screener`, and basis = the screening decision ID;
  - cancel the open identity task.
  - Versions, publication revisions, and notifications don't change.
- Screener rejections reach the identity tables through `closeIdentityLead`, with the reason category and a reference to the precedent or rule.
- Identity tasks are keyed by perk, not by candidate: a new candidate for a perk with an open task joins that task.
- The current identity model assist (`pipeline/identity-review.ts`) and the 90-second end-of-run slot are retired in favour of the Screener's own time slice.
- The lead-triage extraction prompt stops carrying the full all-offers index; the Screener owns dedupe. This shrinks the extraction prompt.
- `IDENTITY_MODE=enforce` stays on. Gate 0 and the Screener run before it, so the bypass in root cause #1 stops mattering. The legacy heuristics remain in use only as Screener hints.

### 6.10 Where things run

- **Screener, Verifier and Profiler** run in the pipeline (GitHub Actions, Node), which already has model and search access and the budget ledger.
- **D1 is on Workers Paid** (owner, 2026-10-12). There's no daily read limit and 25 billion rows read/month are included, so the design favours simplicity over squeezing reads.
  - **Memory snapshot.** At the start of each run the pipeline pulls a compact **memory snapshot**: offers, decided leads, labels, rules and profiles. That is a few thousand rows, fresh every run, with no cross-run cache to keep in sync. Similarity and context assembly run in Node against it. At ~28 runs/day this is roughly 100K rows/day, a rounding error against the monthly allowance.
  - **The Worker validates and applies verdicts with indexed lookups.** It checks that the subject and the matched record are unchanged and that the IDs exist, then commits.
  - **The lead-triage extraction prompt no longer carries the full offer index.**
  - **Reads tracked.** Screening-related reads are counted per run in `/api/admin/health`.
  - **Health monitor thresholds.** The existing D1 usage alert in the health monitor still uses free-plan numbers (5M reads / 100K writes per day). It should be moved to the paid plan's monthly allowance so it stops raising false alarms. This is a small related fix, listed here so it isn't forgotten.
- **The Worker** validates verdicts and applies them atomically. Verdict application reuses the existing `commitIdentityMutation` batch pattern.
- Screening and verification run in **every hourly fast run** with their own time budget, ahead of the full official-source sweep. Within each run, P0 work goes first, then P1, then everything else.
- **Urgent lane.** A Worker cron every 15 minutes runs one indexed query: is any P0/P1 item waiting on system work, such as screening, a verification retry, or draft creation? If so, it dispatches a narrow pipeline run limited to those items (the pipeline already supports targeted runs, e.g. `LEAD_REVIEW_IDS`). When nothing urgent is waiting it does nothing, so there's no dispatch and no GitHub Actions minutes are used. Regular discovery stays hourly.
- **Immediate owner alerts** come from a new Hermes check every 5 minutes. It reads one small indexed endpoint (P0 items in the owner queue not yet notified) and sends through the existing placeholder / receipt ledger. Pending or unknown deliveries are never resent automatically.
- Modes are controlled by `SCREENING_MODE = off | shadow | suggest | auto`:
  - `shadow` records verdicts only;
  - `suggest` shows them to the owner as pre-selected choices;
  - `auto` applies them.
  - Individual rules and automation scopes can also be switched off on their own.

### 6.11 Storage (logical; schemas and migration numbers are left to the builder)

| Table | Purpose |
|---|---|
| `screening_decisions` | One row per verdict: subject (lead / candidate / task), verdict, match, rule, category, confidence, quote, explanation, model, prompt version, context hash, mode, applied action, override (who / when / why) |
| `screening_rules` | Rules (§6.5) with scope, status, author, hits, overrides |
| `decision_labels` | Reason category per historical or new decision, with source `owner` / `inferred` and confidence |
| `platform_profiles`, `platform_profile_events` | §6.6 |
| `agent_predictions`, `automation_scopes` | §6.7 agreement ledger and unlock state |
| `leads.url_key` (new column) | normalized URL for uniqueness (§6.2) |
| Urgency fields on subjects in system or owner queues | tier, deadline (with timezone), signals, quote, tier assigned at / by, due time for the current state, notified-at. Indexed on (tier, due time) for the urgent lane and the Hermes check |

### 6.12 Urgency and review speed

The owner's requirement (§1, §5): review speed scales with time sensitivity, and a perk must not reach the owner when it is already nearly expired.

**Tiers.** Every subject gets a tier at Gate 0 from the claim deadline and deterministic wording signals. The Screener refines it, and it is recomputed when deadline information changes and as time passes.

| Tier | When | System target (discovery → owner) | Owner notification | Queue position |
|---|---|---|---|---|
| **P0 immediate** | deadline ≤24 h; or a one-time same-day distribution (reset cards, redeem codes, "today only"); or quantity-limited and being claimed now | ≤30 min | Telegram immediately, any hour; one reminder after 30 min if untouched | top of the 「紧急」 section |
| **P1 urgent** | deadline 24–72 h; or quantity-limited without a same-day signal | ≤2 h | next hourly reminder, at the top of the batch | 「紧急」 section, below P0 |
| **P2 limited-time** | deadline 3–14 days; or "限时" with no stated deadline | ≤24 h | daily digest | above standing items |
| **P3 standing** | no deadline, standing quota, application programs, or deadline >14 days | ≤72 h | daily digest | bottom, discovery order |

Within a tier, items are ordered by **latest useful review time**: the deadline minus a minimum public window (2 h for P0, 12 h otherwise), then by discovery time.

**Signals.**
- Explicit `claimEnd` and timezone, including relative durations through the existing `campaign-deadline` handling.
- One-time or same-day distribution: reset events, redeem codes, "今天 / today only".
- Quantity limits: "限量 / 先到先得 / 发完即止 / 手慢无 / first N".
- The platform profile's history: for example, this platform's trial cards have run out within hours before (§6.6).

Guards against false urgency:
- A "限时" label with no date reaches only P2.
- Hype wording with neither a date nor a quantity limit never creates P0.
- Any P0/P1 claim needs a verbatim quote. The Gate 0 tier stands unless the Screener cites evidence for a different one.

**Fast lane through the system.**
- **Processing order.** P0, then P1, go first through Gate 0, screening, extraction and verification in every run. They also draw on the reserved part of the daily OpenRouter quota (§6.3).
- **Verification on a short clock (§6.4).**
  - P0 is verified in the same run, retried through the urgent lane, and reaches the owner after 1 hour even if unverified, labelled 「未核实」.
  - P1 reaches the owner after 12 hours if still unverified, with the same label.
  - The verification window never exceeds 25% of the remaining time.
- **Urgent lane** every 15 minutes, only when urgent system work is waiting (§6.10).
- **No model is never a delay.** If no calibrated free model can take a P0 item, it uses the paid fallback. If that also fails, it goes to the owner unscreened, labelled.
- **Deduplication still applies.** A P0 item the Screener recognizes as a duplicate of a published perk is closed as usual: being urgent doesn't make it new.

**Fast approval for the owner.**
- **The P0 Telegram message is enough to decide.** It carries:
  - short code, title and amount;
  - deadline with countdown, in the platform's timezone and Beijing time;
  - eligibility;
  - official, or best available, evidence link and quote;
  - the pre-publication checks already run;
  - the Screener's duplicate result.

  The owner replies 「通过 <短码>」, which is Hermes' existing `ym approve`, or opens the admin card from the link.
- **The P0/P1 admin card is set up for one click.** It shows the countdown and puts approve first. Missing required fields are pre-filled by the agents and flagged, so a correct draft is approved in one click.
- **Earned automation.** In a scope that has earned automation (§6.7), a P0 item auto-publishes without waiting for the owner. The 24-hour push hold doesn't apply to it if its scope had zero corrections in its last 15 auto-publishes.

**Too late to be useful.**
- If an item reaches the owner after its latest useful review time, it is still shown at the top, labelled 「即将截止」, with one-click 「作为历史上架」.
- If the deadline passes while it waits, it automatically becomes a 「作为历史上架」 suggestion and leaves the 「紧急」 section. Nothing stays urgent after its deadline.

**Measured, per tier.**
- median and worst time from discovery to owner;
- time from notification to decision;
- the number of perks that expired while in a system-owned state (target 0);
- the number that expired while waiting for the owner;
- the share of P0 notifications the owner later judged not urgent, which is used to tune the signals.

### 6.13 Community sources (linux.do)

The owner proposed (2026-10-12) dropping linux.do entirely, since most of its leads are noise and most real perks show up on official sites anyway. The data (§2) agrees about the noise, but shows linux.do was also the only route to several approved perks, mainly hard-to-find, time-sensitive ones: in-app gifts, share-link trial cards, new platforms.

**Decided (owner, 2026-10-12): keep linux.do as a discovery-only source, at no cost to the owner:**

- **Title rules at intake (Gate 0, owner-approved).** Close at intake, without a model call or a queue entry, any linux.do lead whose title carries:
  - the 【富可敌国】 tag;
  - relay-station / account-pool / 公益站 wording;
  - everyday non-AI deals.

  On history this removes about a third of the noise and loses no genuine perk.
- **Never sent to the owner unverified.** Linux.do items reach the owner only after the Verifier finds an official source, or as an unverified P0 under §6.12.
- **Each find teaches the monitoring.** When a linux.do lead leads to a verified perk, the platform profile records that perk's official channel and the system proposes it as a monitored source (§6.6). Next time, official monitoring catches it directly.
- **Unique-yield test.** Every community source tracks how many approved perks it surfaced first that no monitored official source had. If linux.do's unique yield is zero for 4 consecutive weeks, the system proposes disabling it, with one click to confirm.

**Alternative considered and not chosen: drop linux.do now.** This removes all linux.do noise immediately, including 101 of the 103 stuck lead reviews. The cost, judging by the last 13 days, is missing roughly 2–4 approved perks every two weeks: mostly short-lived ones where nothing else would have alerted the owner in time. The stuck linux.do items would be closed in the backlog cleanup (§7) either way.

## 7. Backlog cleanup (one-time, and it doubles as calibration)

1. Run the Screener in `suggest` mode over the 77 identity tasks and the 105 leads in review.
2. The owner reviews the proposals in one bulk screen (accept, or override with a category). From the snapshot, ~65–70 identity tasks should close as duplicates of existing records and most of the 103 leads should close by category.
3. These owner-confirmed outcomes plus the 30-item reason spot-check (§6.5) form the **calibration set**.
   - Each candidate model (§6.3) is run against this set in shadow mode.
   - For each model, two thresholds are set separately: "close" (precision ≥97%, no recurring-perk false closes) and "new" (a wrong "new" in ≤2% of cases).
   - A model that can't reach both thresholds is never used for automatic actions.

## 8. Rollout

| Phase | What happens | Gate to next phase |
|---|---|---|
| 0 | Storage, Gate 0, Screener and Verifier in `shadow`; urgency tiers computed and recorded; reason-category UI; reason backfill; platform profile seed | Screener verdicts recorded for ≥1 week of real traffic |
| 1 | Backlog cleanup in `suggest`; threshold calibration. **Urgency goes live:** the 「紧急」 queue section and ordering, P0 Telegram alerts, the urgent lane, and urgency-based verification clocks. These only change order, speed and notifications, never closures, so they don't wait for calibration | Owner has confirmed the backlog; precision ≥97% on the calibration set |
| 2 | `auto` for duplicates and rule/category closures; Verifier time-box and parking; digest with undo | Undo rate ≤3% over 2 weeks |
| 3 | Agreement ledger live; auto-publish proposals per scope | Per-scope owner confirmation |

Each phase is reversible by switching `SCREENING_MODE` back. Rolling back never unpublishes anything; auto-closed items stay closed with their logged reason and can still be undone.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| New round of a recurring perk closed as duplicate | `occurrenceCheck` required for recurring/reset matches; date-window validation; reset-type perks never closed by Gate 0; digest flags recurring-perk closures |
| Model outage or degraded output | Validated schema; failures become `unsure` / wait with due time; never auto-close without a validated verdict |
| Prompt injection from community posts | Subject text is data; match IDs restricted to the supplied set; verbatim-quote check |
| D1 read cost | Workers Paid includes 25B rows read/month; screening adds ~100K/day; reads tracked in health |
| Spend creep | Existing reserve/settle budget ledger; Screener prompt is small; noise is closed before extraction and search |
| Rule over-generalizes | Rules scoped; auto-retire on override rate; owner sees every proposal |
| Free model quality varies or models disappear | Pinned, calibrated models only for auto actions; router verdicts downgraded to suggest; recalibrate before adding a model; health and digest report when no calibrated model is available |
| False urgency causes alert fatigue | P0/P1 need a verbatim quote; hype words without a date or quantity limit never create P0; the owner can mark an alert "not urgent" from the card or Telegram, which feeds signal tuning; the share of non-urgent P0 alerts is tracked |
| An unverified P0 reaches the owner | It's clearly labelled 「未核实」 with what was found. Community-only evidence is never auto-published (§6.7), so the owner decides: verify, 实测, or reject |
| Urgent work runs out of quota or time | 200 requests/day reserved for P0/P1; backfill pauses for urgent work; paid fallback for P0; the urgent lane dispatches only narrow runs |
| Free providers may keep prompts | Screener context sends public lead text, approved and rejected titles/excerpts, and reason categories. It never sends tokens, the internal `reviewMemo`, or `adminNote` drafts |

## 10. Constraints

- Cloudflare Worker + D1, Hono, Drizzle, Node 24 pipeline on GitHub Actions (45-minute job), hourly fast runs and 6-hourly full runs; no new infrastructure. The urgent lane adds a 15-minute Worker cron that dispatches only when urgent work is waiting (GitHub Actions free minutes are 2,000/month for the private repo). The Hermes P0 check adds a 5-minute job on the always-on Mac.
- OpenRouter free models: 1,000 requests/day for this account and 20/minute, shared by all free-model use (§6.3).
- D1 on Workers Paid: no daily limit, 25 billion rows read and 50 million rows written per month included (§6.10).
- Model budget today: `DAILY_TOKEN_CAP=0` (no daily token cap), `MONTHLY_COST_CAP_CNY=10` for extraction's paid fallback. Screening and verification get their own ~$10/month line (§6.3).
- `docs/data-contract.md`, `pipeline/learned-rules.md` and `AGENTS.md` scope rules are unchanged:
  - official evidence for publication;
  - no relay stations or account pools;
  - `tested` only by the admin;
  - internal process notes never in public fields.
- Approved perks keep their approval; nothing is automatically unpublished.
- Repo discipline: tests first, `npm run typecheck`, `npm test`, `npm run build:web` for UI changes, local D1 verification for new write paths. Production migration, deployment and message sending each need explicit owner authorization.

## 11. Open decisions for the owner

None outstanding. Resolved:

1. **Screener and Verifier model budget** (owner, 2026-10-12): about $10/month, trying `openrouter/free` first. The owner's OpenRouter account already holds $20+ of purchased credit, so the 1,000 requests/day tier applies. The design pins specific calibrated free models and keeps the router as a fallback (§6.3).
2. **Time sensitivity** (owner, 2026-10-12): review speed must scale with how time-sensitive a perk is. Urgent one-time perks go to the front of the queue immediately, with a notification, and are set up for fast approval (§6.12).
3. **D1 plan** (owner, 2026-10-12): the account is on Workers Paid, so the free plan's 5M rows/day limit does not apply (§6.10).
4. **linux.do** (owner, 2026-10-12): keep it as a discovery-only source, with intake title rules and a 4-week unique-yield test (§6.13).
5. **Design approved for implementation planning** (owner, 2026-10-12).

## 12. Calls made by the author (owner should check these)

- Use pinned, calibrated `:free` models rather than the `openrouter/free` router for anything automatic. Split the 1,000/day quota into 200 reserved for urgent work, non-urgent screening up to 800, and backfill at most 400/day. The ~$10/month pays for P0 fallback calls and, if needed, a calibrated paid model (§6.3).
- Urgency tiers, targets and notification rules as in §6.12:
  - P0 is notified immediately at any hour, with one reminder after 30 minutes.
  - P0 reaches the owner unverified, and clearly labelled, if it can't be verified within 1 hour.
  - The queue is ordered by urgency for P0–P2, which replaces the 2026-10-03 discovery-order rule for those tiers; P3 keeps discovery order.
- Keep this document in English and Chinese (`2026-10-12-lead-screening-redesign-design.zh-CN.md`) with identical content; any change updates both.
- Keep the identity tables as the system of record and put the Screener in front, rather than replacing the identity system.
- Screener runs before extraction for community leads and after extraction for official candidates.
- Targets in §4, thresholds in §6 (0.9 / 0.95 similarity, 3 attempts / 48 h, 14-day parking, ≥15 decisions / ≥93% agreement, rule proposal at ≥3 rejections), all subject to calibration.
- Platform profiles move from `platform-notes.md` to D1, and the markdown file is frozen as history.
- Auto-publish unlocks need a one-click owner confirmation per scope rather than switching on by themselves.
- Only owner decisions are authoritative precedents. Pipeline-model rejections and links are hints only, and the 380 unattributed rejections are re-screened rather than trusted (§6.5.1).
- A Screener "new" verdict, after verification, creates a pending draft directly instead of first opening an identity task for the owner (§6.3).
- With D1 on the paid plan, the pipeline pulls a fresh memory snapshot every run rather than maintaining an incremental cache (§6.10).
- Phase 3 adds a narrow `agent:publisher` approval role. Auto-published perks go live with a system-estimate valuation and are held out of Feishu, urgent push and RSS for 24 hours (§6.7).

## 13. Left to the builder

Table schemas and migration numbers; prompt wording; similarity and retrieval ranking implementation; admin UI layout; Telegram digest formatting; how undo reverses each action type internally, as long as it's one click, logged, and creates a negative example; batching and caching of Screener calls within the D1 and time budgets.
