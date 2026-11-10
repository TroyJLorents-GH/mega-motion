// Motion tokens: every duration, easing and distance the signature system uses, in one place.
// Values are the measured system in skills/signature-site/SKILL.md. Change them here, never in code.

// One house curve for hovers and state changes; expo.in only for the brand mask; power1.inOut or linear when scrubbed.
export const EASE = {
  house: 'M0,0 C0.65,0.05 0,1 1,1', // cubic-bezier(0.65, 0.05, 0, 1)
  roll: 'M0,0 C0.19,1 0.22,1 1,1', // cubic-bezier(0.19, 1, 0.22, 1), button letters
};
export const CSS_EASE = {house: 'cubic-bezier(0.65, 0.05, 0, 1)', roll: 'cubic-bezier(0.19, 1, 0.22, 1)'};

// The brand threshold: the intro, and every page change. Seconds.
export const THRESHOLD = {
  ease: 'expo.in', // accelerating in: almost nothing for the first half, most of the opening at the end
  introMinHold: 0.6, // the intro brand screen holds at least this long from navigation start
  introReveal: 0.38, // the mark-shaped hole opens past the viewport
  cover: 0.37, // page change: the mark slab grows from the click point until the screen is solid
  holdMin: 0.12, // then holds while the next page is fetched (prefetched on hover, so usually already in): at least...
  holdMax: 0.9, // ...and at most (the real load time, never a fixed 1.2 s)
  reveal: 0.335, // the mirrored hole on the new page
  rmFade: 0.2, // reduced motion: the whole threshold is a 200 ms fade
  idleBreath: 0.05, // the mark breathes 5% while the brand screen waits
  idlePeriod: 1.1,
  readyTimeout: 4, // reveal anyway if the page is not ready by then
  navFailsafe: 4, // uncover anyway if navigation has not happened by then
  hardFailsafe: 8, // last resort if the script itself fails
};

// Highlight wipe on headings, eyebrows and labels ([data-wipe]).
export const WIPE = {
  start: 0.9, // starts when the element's top reaches 90% of the viewport; plays once
  line: 0.6,
  lineEase: 'power3.out',
  block: 0.6,
  blockDelay: 0.3,
  blockEase: 'power3.inOut',
  lineStagger: 0.08,
  foldSpeed: 1.7, // headings already on screen when a threshold opens: the mask was their reveal, so the wipe is a quick echo
  captureEnd: 0.62, // ?capture: scrubbed from top 90% to top 62%, so a scroll position is one frame
};

// The 3D hero inside its sticky 1 vh pin.
export const HERO = {
  scrubEase: 'power1.inOut',
  card: {desktop: [0.31, 0.38], phone: [0.74, 0.4]}, // end card as fractions of viewport width, height
  centerY: {desktop: 0.47, phone: 0.42}, // card (and rock) centre, fraction of viewport height
  radius: 14, // card corner, px
  fill: {desktop: 0.6, phone: 0.84, card: 1.02}, // rock diameter: of min(vw, vh) at full bleed (phone: of vw); of the card
  desaturate: 0.85, // grey amount at the card end
  fov: 30,
  follow: 0.03, // exponential follow per 60 fps frame (50% at ~380 ms)
  tilt: [0.55, 0.32], // follow rotation in radians for a pointer at the edge (y axis, x axis)
  spin: 0.07, // idle turn, rad/s
  trailFade: 0.6, // a painted stroke fades out over 600 ms
  brush: 0.13, // brush radius, fraction of the canvas height
  sweep: 1.7, // the one autonomous stroke when no pointer has moved, seconds
  dpr: {desktop: 1.25, phone: 2},
};

// The 1:1 horizontal gallery.
export const GALLERY = {
  colorEase: 'power2.out', // ground to bone across the pin
  textFlip: [0.42, 0.5], // the text colour crosses over inside this part of the colour shift
};

export const UI = {
  roll: 0.6, // button letters
  rollStagger: 0.015,
  card: 0.75, // card and row hover, house curve
  menuDrop: 0.32,
  menuEase: 'expo.out',
  menuCurve: 0.55, // the convex edge settles a little after the panel lands
  menuRestBulge: 0.22,
  menuLinks: 0.6,
  menuLinkStagger: 0.05,
  menuClose: 0.26,
};

export const SCROLL = {
  lenisLerp: 0.1, // desktop wheel only
  bioHold: 0.65, // the about chapter is sticky for this many viewport heights (its text is data-read)
  drift: 5, // the topographic layer behind the about text drifts this many % while it is read
};

export const PHONE = '(max-width: 760px)';
