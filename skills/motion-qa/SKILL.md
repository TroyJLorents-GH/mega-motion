---
name: motion-qa
description: Use before calling any motion work done, or when motion stutters, jumps, misframes on phones, or fails reduced-motion or accessibility checks: measurable gates, result statuses, the critic's evidence and how to run checks through the qa-runner and motion-critic agents.
---

# Motion QA

Measure what can be measured; label everything else honestly.

1. Every result is one of: measured pass, measured fail, critic judgment, needs human evidence, not tested, not applicable. Each names its evidence file.
2. Compare against an independently authored manifest (reading ranges, holds, pins, required facts), never against what the build reports about itself.
3. Delegate execution to the `qa-runner` agent; it returns `checks.json` and a short summary.
4. Delegate review of rendered evidence to the `motion-critic` agent; it never sees the builder's notes.
5. Physical-device results come from a person or a device farm; never pass them from desktop emulation.

## Red flags

- A pass with no evidence file
- An unsupported API reported as an empty pass
- The builder reviewing their own work
- Desktop emulation reported as a phone test

Defaults: `../../shared/defaults.md`. Failure modes: `../../shared/failure-modes.md`. Starting a new piece rather than fixing one: begin with the `direct` skill.

## Files

- `references/qa-automation.md`: gates and thresholds, harness traps, collector sketch, critic evidence, what the critic cannot see
- `references/review-checklist.md`: the reviewer's checklist with result statuses
- `references/critique.md`: why the critique loop exists
