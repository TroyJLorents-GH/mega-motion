// Toggle switch. A native <button role="switch">, so Space, Enter, focus and screen readers work for free.
//
//   const t = createToggle(document.querySelector('#wifi'), {checked: true, onChange: (on) => save(on)});
//   t.checked; t.set(false); t.set(true, {animate: false});
//
// Motion: the knob rides one critically damped spring, so a second tap mid-slide reverses from where the knob
// is, with its velocity, never queued. Pressing stretches the knob toward the side it will travel to (transform
// only). The "on" colour is a layer whose opacity follows the same spring. Reduced motion: the knob jumps and
// only the colour fades.
import {SPRING, T, EASE, pressable, prop, reducedMotion, spring} from './motion.js';

const PAD = 2;
const STRETCH = 6; // px the knob grows while pressed

export function createToggle(button, {checked = false, onChange} = {}) {
  button.type = 'button';
  button.setAttribute('role', 'switch');
  button.classList.add('mm-switch');
  button.innerHTML = `<span class="mm-switch__track" aria-hidden="true"><span class="mm-switch__fill"></span><span class="mm-switch__hover"></span><span class="mm-switch__shadow"></span><span class="mm-switch__thumb"><span class="mm-switch__knob"></span><span class="mm-switch__knob mm-switch__knob--b"></span></span></span>`;
  const track = button.querySelector('.mm-switch__track');
  const fill = button.querySelector('.mm-switch__fill');
  const hover = button.querySelector('.mm-switch__hover');
  const shadow = button.querySelector('.mm-switch__shadow');
  const thumb = button.querySelector('.mm-switch__thumb');
  const knobB = button.querySelector('.mm-switch__knob--b');

  let on = !!checked;
  let geo = null;
  const measure = () => {
    const tw = track.offsetWidth;
    const k = thumb.offsetWidth;
    geo = {k, travel: tw - PAD * 2 - k};
  };
  let p = on ? 1 : 0;
  let s = 0;
  const paint = () => {
    if (!geo) measure();
    const e = STRETCH * s;
    const x = PAD + p * geo.travel - p * e;
    thumb.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    knobB.style.transform = `translate3d(${e.toFixed(2)}px,0,0)`;
    shadow.style.transform = `translate3d(${x.toFixed(2)}px,0,0) scaleX(${((geo.k + e) / geo.k).toFixed(4)})`;
  };
  const pos = spring(p, {...SPRING, onUpdate: (v) => { p = v; paint(); }});
  const tint = prop(p, (v) => { fill.style.opacity = Math.min(1, Math.max(0, v)).toFixed(3); });
  // the colour rides the knob's spring when there is travel, so they can never disagree mid-flight
  const posTint = spring(p, {...SPRING, onUpdate: (v) => tint.set(v)});
  const {spring: press} = pressable(button, (v) => {
    if (reducedMotion()) {
      s = 0;
      hover.style.opacity = (0.6 * v).toFixed(3);
    } else {
      s = v;
      hover.style.opacity = (0.5 * v).toFixed(3);
    }
    paint();
  });

  const render = (animate) => {
    button.setAttribute('aria-checked', String(on));
    const target = on ? 1 : 0;
    if (!animate) {
      pos.set(target);
      posTint.set(target);
    } else if (reducedMotion()) {
      pos.set(target);
      tint.to(target, T.feedback, EASE.linear);
    } else {
      pos.to(target);
      posTint.to(target);
    }
  };

  button.addEventListener('click', () => {
    on = !on;
    render(true);
    onChange?.(on);
  });
  addEventListener('resize', () => { geo = null; paint(); });
  render(false);

  return {
    el: button,
    get checked() { return on; },
    set(value, {animate = true} = {}) {
      if (!!value === on) return;
      on = !!value;
      render(animate);
    },
    press,
  };
}
