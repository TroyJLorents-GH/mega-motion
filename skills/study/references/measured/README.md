# Measured reference library

The defaults in `shared/defaults.md` are judgment. This library is evidence: real sites, measured. Each file is one site with every value's source and confidence. A value reported by a model is a lead, not a measurement; re-measure it with the `study` skill (or the `reference-analyst` agent) before relying on it, then update its confidence.

Template for a new entry:

```
# <Site> (<award, date, URL>)
| Moment | Scroll range or trigger | Duration | Easing | Source | Confidence |
The one decision that makes it work:
What to borrow / what not to:
Measured on: <date, viewport, browser>
```

Sources: synthesised from three model reviews (Fable 5.1, GPT-6 ASTRA, Gemini 4 Argon) on 2026-10-30, kept in the research folder. Items marked *verified* were checked against a primary source; everything else is reported or judgment.
