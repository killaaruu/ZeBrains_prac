---
name: frontend-design
description: Guidance for distinctive, intentional visual design when building or reshaping UI. Use when implementing a new screen/component, styling a feature, or when the user asks for a polished, non-templated look. Pairs with new-frontend-feature for the structure.
argument-hint: "[screen or component]"
---

# Frontend design

Make UI that looks intentional, not like a framework default. Apply when building
or reshaping any screen/component in `apps/web`.

## Principles
- **Hierarchy first.** Decide what the eye should hit 1st/2nd/3rd; use size, weight,
  spacing, and color to enforce it. Most elements should be quiet so the important
  one is loud.
- **Typography.** Limit to 1–2 families; build a clear scale (don't use 6 random
  sizes). Generous line-height for body, tight for headings. Align to a baseline.
- **Spacing & rhythm.** Use a consistent spacing scale (the project's Tailwind scale).
  Whitespace is a feature, not wasted space. Group related things, separate unrelated.
- **Color.** A restrained palette + one accent. Ensure contrast (WCAG AA). Use color
  to mean something (status, action), not for decoration.
- **Motion.** Subtle, fast (≤200ms), purposeful — feedback and transitions, never
  decoration that delays the user.

## Always design every state
- **Loading** (skeleton/spinner), **empty** (helpful, not blank), **error**
  (clear + recoverable), **success**, and **long-content** (truncation/overflow).
  For TrendScout: report generation has `queued → thinking → done/error` — design
  each, not just the happy path.

## In this repo
- Reuse `apps/web/src/shared/ui` (Radix + Tailwind) and existing components before
  inventing new ones. Match the established look.
- Keep components small and composable; follow the import rules in `CLAUDE.md`.
- Verify in a real browser (`make local`) before claiming a UI task done.
