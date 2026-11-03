// Motion tokens: every duration, easing and scroll distance the page uses, in one place.
// Easings are the house set (shared/defaults.md): enter, move, exit. Scroll distances are in viewport heights.
export const EASE = {
  enter: 'M0,0 C0.16,1 0.3,1 1,1', // arrivals
  move: 'M0,0 C0.76,0 0.24,1 1,1', // repositions and scrubbed processes (slow, fast, slow)
  exit: 'M0,0 C0.7,0 0.84,0 1,1', // departures
};

export const DUR = {
  heroProduct: 0.9, // the product lands first
  heroGap: 0.25, // the headline follows 250 ms after the product settles
  heroLine: 0.8,
  lineStagger: 0.09,
  reveal: 0.6, // body copy arriving inside a pin
  specStagger: 0.07,
};

// Scrub catch-up on desktop wheel input only (never on touch, never in ?capture).
export const SCRUB_DESKTOP = 0.5;

// Inside each pin, progress 0..1. "th" is where the body copy is triggered; "read" is where it must be
// fully settled and still (it is marked data-read from there to the end of the pin).
export const BEATS = {
  quiet: {calm: [0.08, 0.5], th: 0.54, read: 0.6},
  battery: {fill: [0.06, 0.5], lift: [0.5, 0.6], th: 0.6, read: 0.66}, // lift: the count, centred, rises to make room for the text
  weight: {drop: [0.05, 0.34], settle: [0.34, 0.6], th: 0.63, read: 0.69, tilt: -9},
};

// Hysteresis on text triggers (never on scroll position): hide again only this far below the threshold.
export const HYSTERESIS = 0.05;
