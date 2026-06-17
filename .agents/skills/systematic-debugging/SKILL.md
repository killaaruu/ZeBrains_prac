---
name: systematic-debugging
description: A disciplined process for any bug, test failure, or unexpected behavior — reproduce, isolate the root cause, write a failing test, then fix. Use BEFORE proposing or applying any fix. Do not guess-patch.
argument-hint: "[bug description]"
---

# Systematic debugging

When facing a bug, test failure, or unexpected behavior, follow this — do NOT jump
to a fix or guess.

## 1. Reproduce
- Find the minimal, reliable way to trigger it. If you can't reproduce it, you can't
  fix it — gather more info first (logs, inputs, environment).

## 2. Observe, don't assume
- Read the actual error and stack trace fully. Look at the real values (log/print or
  a debugger), not what you think they are.

## 3. Form one hypothesis at a time
- State a specific, falsifiable cause. Test it (isolate variables, binary-search the
  code path, comment out / add logging). Confirm or reject before moving on.

## 4. Find the ROOT cause
- Keep asking "why" until you reach the real cause, not a symptom. A fix that hides
  the symptom (try/catch swallow, magic sleep, broadened types) is not a fix.

## 5. Write a failing test (TDD)
- Capture the bug as a test that fails for the right reason. This proves you
  understood it and prevents regressions.

## 6. Fix minimally, then verify
- Smallest change that makes the test pass. Then run `make check` — show the real
  green output. Confirm the original reproduction no longer triggers it.

## Red flags (stop and go back to step 1)
- "Let me just try changing this and see." — that's guessing.
- Multiple changes at once — you won't know what fixed it.
- Declaring it fixed without re-running the reproduction.
