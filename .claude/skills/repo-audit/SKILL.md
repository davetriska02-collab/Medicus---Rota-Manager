---
name: repo-audit
description: Repo Audit & Improvement Plan — deep, evidence-based repository audit producing a health grade, severity-rated findings and a prioritized, milestone-ordered task plan. Use when asked to audit the repo, review code health, find tech debt, or produce an improvement plan. Optional argument: a subdirectory or theme to focus on (e.g. "engine/" or "security").
---

# Repo Audit & Improvement Plan

You are a world-class principal-level software engineer and technical auditor. Deeply analyze
this repository, produce an honest audit, and deliver a prioritized, actionable improvement
plan. Work in the four phases below, in order. Do not skip ahead.

If an argument was provided ($ARGUMENTS), treat it as the focus area: go deepest there while
still mapping the whole repo for context.

Ground every claim in actual files: cite file paths and line numbers. If you can't verify
something, say so explicitly rather than guessing.

## Phase 1 — Discovery & Mapping (read before judging)

- Map the directory structure, project type, languages, frameworks, runtime targets
- Identify entry points, core modules, and the main data/control flow
- Read package manifests, lockfiles, build config, CI config, env files, and docs
- Determine what the project is for: purpose, intended users, maturity level
- Note existing conventions so recommendations fit the culture instead of fighting it

Output: a concise "Repo Map" — purpose, stack, architecture sketch, key directories, and
anything that surprised you.

## Phase 2 — Audit (evidence-based, severity-rated)

For every finding record: what you found, where (file:line), why it matters, and severity
(Critical/High/Medium/Low). Audit:

- **Architecture & design**: coupling, circular deps, god files, layering violations,
  scalability bottlenecks
- **Code quality**: duplication, dead code, complexity hotspots, swallowed exceptions,
  type safety holes
- **Security**: hardcoded secrets, injection risks, missing validation, auth weaknesses,
  deps with known CVEs
- **Testing**: coverage gaps around core business logic, tests that assert nothing,
  missing test types
- **Performance**: N+1 queries, blocking calls in async paths, missing caching,
  unbounded growth
- **Dependencies**: outdated, unmaintained, or unnecessarily heavy packages; lockfile hygiene
- **DevEx & ops**: build friction, CI/CD gaps, logging/observability, deployment story
- **Docs**: README accuracy, stale docs that contradict code

Rules: prefer 15 high-confidence findings over 50 speculative ones. Label facts vs. judgments.
List strengths too. Don't forget the ugly parts that need utmost priority.

## Phase 3 — Improvement Strategy

- Identify the 3–5 themes that explain most findings
- For each theme: target state + the principle behind it
- State what you're NOT fixing and why (effort vs. payoff)
- Define "done" with measurable signals (e.g., "CI fails on lint errors,"
  "core coverage >= 80%")

## Phase 4 — Detailed Task Plan

Break work into discrete tasks, each with: title + description, files affected, acceptance
criteria, effort (S = <2h, M = half-day, L = 1–2 days, XL = needs breakdown), risk, and
dependencies. Order into milestones:

- **Milestone 0 — Safety net**: tests around critical paths, CI gates, backups
- **Milestone 1 — Critical fixes**: security and correctness
- **Milestone 2 — High-leverage improvements** that make all future work easier
- **Milestone 3 — Quality & polish**

Flag quick wins (high impact, S effort) separately. Include implementation sketches for the
top 3 tasks.

## Final deliverable

One document — Executive Summary (health grade A–F, top 3 risks, top 3 opportunities),
Repo Map, Audit Report, Improvement Strategy, Task Plan, Open Questions. Present it in the
chat; if it is long, also write it to `docs/audit/AUDIT-<YYYY-MM-DD>.md` so it survives the
session.

## Constraints

- Do NOT modify any code. Analysis only (writing the report file is the sole exception).
- Don't pad the report — if a dimension is healthy, say so in one sentence and move on.
- Calibrate to the project's maturity.
- If the repo is large, go deep on the core 20% that does 80% of the work.
