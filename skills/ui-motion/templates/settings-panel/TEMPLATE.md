# settings-panel: an interface-motion kit, shown as a settings panel

A dark settings panel (four switches, a slider, a save button, a confirmation toast) built from a small,
dependency-free motion kit. Plain HTML, CSS and ES modules; no GSAP needed. Each component in `kit/` can be
lifted into another app on its own.

```
node <plugin>/shared/web-studio/new_page.mjs my-panel --template ui-motion/settings-panel
cd my-panel && npm install
node studio/web.mjs check     # feedback < 100 ms per tour step, fast repeats, no errors, reduced motion
node studio/web.mjs shots     # a tile per tour step, phone and desktop
node studio/web.mjs film      # recorded tour, out/run-phone.mp4 and out/run-desktop.mp4
```

Edit `content.json` for words, colours, defaults and the demo save latency. Edit `main.js` for layout and
wiring. `tour.js` is only for the studio (synthetic pointer and keyboard input, plus a faint touch ring for
recordings); delete it and the `installTour()` call in an app.

## Files

| File | What it is |
|---|---|
| `kit/motion.js` | One frame loop, one spring (critically damped, retargetable with velocity), `prop` tweens that start from the current value, easings, the timing tokens `T`, `pressable`, input-modality tracking for focus rings |
| `kit/toggle.js` | `createToggle(button, {checked, onChange})`: a `<button role="switch">` |
| `kit/slider.js` | `createSlider(el, {min, max, step, value, format, onDisplay, onInput, onChange})`: `role="slider"`, pointer, touch and keyboard |
| `kit/async-button.js` | `createAsyncButton(button, {labels, onLoading, onResult, onSettle})` with `.run(task)` and `.disabled` |
| `kit/toaster.js` | `createToaster(region, {duration, max, side})` (bottom centre; `side: 'right'` for a desktop corner stack) with `.toast({title, description, tone, action})` and `.dismiss(id)` |
| `kit/kit.css` | Component styles; theme with the `--mm-*` custom properties |
| `main.js`, `styles.css`, `index.html` | The panel; `content.json` the copy and colours |

## Timing

| Element | Trigger | Motion | Reduced motion |
|---|---|---|---|
| Button press | pointer or key down | scale 0.96 and a 16% darker fill on a spring (response 0.1 s in, 0.26 s out), visible in the first frame | darker fill only |
| Switch | tap, click, Space, Enter | knob on the product spring (response 0.24 s, damping 1: about 150 ms to rest, no overshoot); "on" colour layer follows the same spring; pressing stretches the knob 6 px toward its travel | knob jumps; colour fades 140 ms |
| Switch, tapped again mid-slide | second tap | reverses from where it is, with its velocity; nothing is queued | same jump |
| Slider drag | pointer | knob and fill locked to the finger; past either end, up to 6 px of resistance, springs back on release | same (direct manipulation) |
| Slider tap on track, arrow keys | tap, Arrow/Page/Home/End | glides on the soft spring (response 0.34 s, about 240 ms); the read-out follows the knob | jumps |
| Save | click | label rolls to "Saving…" at once (out 70 ms ease-in, then in 160 ms ease-out, 9 px roll, never two labels at once); spinner glyph only after 300 ms, then held at least 400 ms; success fill fades 140 ms; "Saved" held 1.4 s, then rolls back | crossfades in place, spinner hidden |
| Save while busy | click | press feedback only; no second request, no queue | same |
| Toast in | save succeeds (+90 ms) | rises 20 px on the product spring, fades in 240 ms; older toasts step back 10 px and 5% smaller, three visible | fade only |
| Toast out | timer (4 s), close, Escape | fades 100 ms ease-in (exits shorter than entrances), drops 8 px | fade only |
| Toast swipe | drag sideways | follows the finger 1:1; release past 35% of its width or faster than 0.45 px/ms flings out with the release velocity, else springs home | fade on dismiss |
| Toast stack | hover, focus, tap (touch) | fans out on the soft spring; all timers pause (also while touched or the tab is hidden) | positions jump |
| Status line | any change | text fades 70 ms out, then 160 ms in; rapid changes collapse to the latest | same |

All durations live in `T` in `kit/motion.js`; all springs are `SPRING`, `SPRING_SOFT` and `SPRING_DRAG` there.
Only `transform` and `opacity` change per frame. CSS transitions are used only for properties JavaScript never
drives (hover colours, the slider halo, the disabled colour).

## Reuse in plain JS

```js
import {createToggle} from './kit/toggle.js';
import {createAsyncButton} from './kit/async-button.js';
import {createToaster} from './kit/toaster.js';
// plus <link rel="stylesheet" href="kit/kit.css">

const wifi = createToggle(document.querySelector('#wifi'), {checked: true, onChange: (on) => api.set({wifi: on})});
const toaster = createToaster(document.querySelector('#toaster'));
const save = createAsyncButton(document.querySelector('#save'), {
  labels: {idle: 'Save', loading: 'Saving…', done: 'Saved', error: 'Try again'},
  onResult: (r) => r === 'done' && toaster.toast({title: 'Saved'}),
});
document.querySelector('#save').addEventListener('click', () => save.run(() => fetch('/api', {method: 'POST'})));
```

## Reuse in React

The components own their DOM, so mount them once on a ref and keep React out of their subtree:

```jsx
function Switch({checked, onChange}) {
  const ref = useRef(null);
  const api = useRef(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    api.current = createToggle(ref.current, {checked, onChange: (v) => cb.current?.(v)});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.current?.set(checked); }, [checked]); // controlled: animates to the new value
  return <button ref={ref} aria-label="Wi-Fi" />;
}
```

Do the same for the slider (`set(value)`), the button (call `.run()` in your submit handler) and the toaster
(create it once at the app root and expose `toast` through context). Or port only `kit/motion.js`'s `spring`
and keep the timing table: it is the spec, the code is one way to meet it.

## Notes

- `aria-disabled`, not `disabled`, on the save button, so it stays focusable; dimmed by colour, not opacity.
- Focus rings appear for keyboard users only (`html[data-input="keyboard"]`), with no delay, in one neutral colour.
- The demo save waits `content.json` `demo.saveLatencyMs` (650 ms). Replace `request` in `main.js` with a real call.
