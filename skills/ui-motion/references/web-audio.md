# Interactive web audio

Sound makes motion feel physical, and almost no cheap site has it. It is also the fastest way to annoy people. Sources: synthesised from three model reviews (Fable 5.1, GPT-6 ASTRA, Gemini 4 Argon) on 2026-10-30, kept in the research folder. Items marked *verified* were checked against a primary source; everything else is reported or judgment.

- **Off by default.** A visible sound toggle; start the `AudioContext` only after a user gesture (browsers block autoplay audio); remember the choice.
- **Mute when hidden:** suspend on `visibilitychange`.
- **Synthesise, don't download:** short UI ticks as a band-passed noise burst (about 12 ms decay around 2.4 kHz, Gemini's values, judgment); a quiet ambient bed around -32 dBFS whose filter cutoff follows scroll velocity (about 180 to 900 Hz) so scrolling has acoustic friction.
- **One sound per visible event,** never on every scroll tick; hero events loudest.
- Respect the user: no sound on load, no sound tied to reading, and an obvious way to turn it off.
