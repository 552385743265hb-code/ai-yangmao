# Public Agent Access Implementation Plan

> **For agentic workers:** Use native execution in this session, then independent review. Steps use checkbox syntax.

**Goal:** Deliver anonymous read-only Skill and MCP access to benefits and the latest shared Feishu digest.
**Architecture:** A pure shared query module handles eligibility/filtering. One public service loads approved data and formats JSON/Markdown for HTTP and the official MCP SDK. Scheduled generation freezes a singleton digest consumed by Feishu and public reads.
**Tech Stack:** TypeScript, Hono, D1, Zod, official MCP SDK, static HTML/JS.
**Spec:** `docs/specs/public-agent-access.md`

## Global Constraints

- No administrator operations, credentials, profile persistence, independent CLI, or historical digest endpoints.
- Public queries never generate reports, translate content, or send notifications.
- Skill and MCP share queries; Feishu and public daily output share frozen content.
- Keep unrelated local changes; this task does not authorize production migrations or deployment.
- This original local-only boundary was superseded by the user's explicit 2026-10-12 request to harden, commit and deploy; delivery verification still must not send an unsolicited message.

## Review Focus

- Omitted user conditions remain unknown; explicit empty subscriptions mean no memberships.
- Pending/internal fields never appear in results or daily snapshots served publicly.
- Stored original excerpts stay in their source language.
- Quota/snapshot fallback stays visibly degraded and does not imply current eligibility.
- Concurrent digest generation and repeated sends preserve one report and existing delivery protections.

### Task 1: Shared query and public service

- [x] Write and run failing `tests/agent-query.test.ts` and public route tests.
- [x] Add `src/shared/agent-query.ts` and `src/worker/agent-service.ts`: allowlisted public fields, tri-state eligibility, stable paging, filters, catalog, details.
- [x] Run query/service tests and typecheck.

### Task 2: Frozen daily digest

- [x] Write failing `tests/public-daily.test.ts` covering same content, repeat/race, no read writes.
- [x] Add singleton migration and `src/worker/daily.ts`; reuse `buildNotice`/`buildCards`, let `claimNotice` accept frozen selection, use frozen cards in Feishu.
- [x] Run daily and existing Feishu tests.

### Task 3: HTTP and MCP

- [x] Write failing protocol tests using SDK client.
- [x] Add HTTP query/Markdown routes and four read-only tools via stateless Web Standards transport; validate origin, bounded bodies, input, no-store responses.
- [x] Exercise SDK initialize/list/call, invalid arguments, unknown tools and degraded data.

### Task 4: Skill, website, verification

- [x] Add public skill, atomic installer, metadata and server-side capability instructions; build into static assets.
- [x] Add Agent page and navigation in desktop/mobile; copyable MCP/Skill configuration.
- [x] Validate installer with isolated home, package hashes, Skill validator and realistic read-only evaluation.
- [x] Run `npm run typecheck`, `npm test`, `npm run build:web`, Worker build and local HTTP/MCP/browser smoke.
- [x] Obtain independent review and fix verified findings; report local versus deployed state.

## Execution evidence (2026-10-12)

All tasks completed locally. The public Skill validator passed; the installer was exercised against both a temporary HTTP fixture and the actual local Worker, including update backup, corrupt-download rejection and foreign-skill protection. Official SDK client initialize/list/search/daily completed against the Worker on localhost:8770. The existing scheduled handler generated a latest report in an isolated local D1 database; public reads did not generate it.

Independent review found translated quotations replacing originals in shared daily Markdown. `keeps original quotations in the shared Markdown when a translation exists` failed first, then passed after preserving original language and labeling the separate translation. No other substantive finding or deferred item was reported. Independent Skill evaluation used the published HTTP workflow, maintained unknown conditions, and correctly identified synthetic demonstration records. Its phone-key ambiguity was clarified; future verification dates now remain unknown with a regression test.

Latest verification: typecheck passed; 84 test files / 1019 project tests and 11 review-CLI tests passed; static build and Cloudflare Worker dry-run passed. Desktop/mobile layouts in both themes checked; mobile had no horizontal overflow. No production migration, deployment, commit or push was performed.

## Hardening and release follow-up

The subsequent user request authorized release. Independent practical/operational reviews reproduced missing-membership inference, coverage freshness, generation-cache staleness, quota retry amplification, large MCP pages, installer replacement failure and stale-lock races, and digest repair/send races. Each was addressed with a failing reproduction and regression coverage. Public search now supplies bounded summaries and ID groups; complete details remain available through HTTP and MCP, including profile-based HTTP detail queries. Daily publication claims atomically verify the frozen edition; repairs are explicit, numbered, and blocked after any possible delivery. The read-only `scripts/smoke-public-agent.mjs` exercises the actual SDK and HTTP paths, concurrent reads, private-field exclusion and malformed history requests.
