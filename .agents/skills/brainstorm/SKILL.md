---
name: brainstorm
description: Turn an idea into a validated design BEFORE writing any code — ask clarifying questions, propose approaches, then write a spec. Use when the user says "/brainstorm X", "спроектируй X", "давай обсудим X", or wants to design a new feature/component before implementation. Do NOT use for implementing an existing issue (use impl-issue).
argument-hint: "[topic]"
---

# Brainstorm an idea into a design

Help turn the user's idea (the argument / topic) into a fully formed design.
**Do not write code or scaffold anything until the design is approved.**

## Process
1. Explore project context (files, `docs/`, recent commits, `AGENTS.md`/`CLAUDE.md`).
2. Ask clarifying questions **one at a time**, preferably multiple-choice — focus on
   purpose, constraints, success criteria.
3. Propose 2-3 approaches with trade-offs; lead with your recommendation and why.
4. Present the design in sections; after each, confirm it looks right.
5. After approval, write the spec to
   `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and commit it on a branch.

## Principles
- YAGNI — cut anything not needed by the current goal.
- Keep units small, single-purpose, testable through clear interfaces.
- Follow `AGENTS.md`/`CLAUDE.md` conventions.

Terminal state: a committed spec ready to drive `impl-issue` / a plan. Do not start
implementation from this skill.
