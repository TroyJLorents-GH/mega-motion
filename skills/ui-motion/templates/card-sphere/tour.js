// The interface tour the web studio drives: window.__tour = [{label, hold}], window.__tourStep(i).
// Each step is a real input on the real element (pointer events or keys), so a passing check means the input
// path works. A faint marker shows the "finger" in recordings. Not needed in an app: delete this file and the
// installTour() call in main.js.
const kind = () => (innerWidth < 720 ? 'touch' : 'mouse');
let id = 40;

function fire(el, type, x, y, pid) {
  el.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: pid, pointerType: kind(),
    isPrimary: true, button: type === 'pointermove' ? -1 : 0, buttons: type === 'pointerup' ? 0 : 1,
  }));
}

export function installTour(stage, sphere) {
  const dot = document.createElement('div');
  dot.className = 'tour-touch';
  dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);
  const at = (x, y, o) => { dot.style.transform = `translate3d(${x}px,${y}px,0)`; dot.style.opacity = o; };

  // A drag of (dx, dy) px over `ms`, released while still moving, so momentum carries on.
  const drag = (dx, dy, ms = 260) => {
    const r = stage.getBoundingClientRect(), x0 = r.left + r.width * 0.5 - dx / 2, y0 = r.top + r.height * 0.5 - dy / 2;
    const pid = ++id, n = 12;
    at(x0, y0, 1);
    fire(stage, 'pointerdown', x0, y0, pid);
    for (let i = 1; i <= n; i++) {
      setTimeout(() => {
        const x = x0 + (dx * i) / n, y = y0 + (dy * i) / n;
        fire(stage, 'pointermove', x, y, pid); at(x, y, 1);
        if (i === n) { fire(stage, 'pointerup', x, y, pid); setTimeout(() => at(x, y, 0), 200); }
      }, (ms * i) / n);
    }
  };
  const key = (k) => { stage.focus({preventScroll: true}); stage.dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true, cancelable: true})); };

  const steps = [
    {label: 'drag and throw right', hold: 3400, run: () => drag(260, -60)},
    {label: 'drag and throw down-left', hold: 3400, run: () => drag(-200, 160)},
    {label: 'slow drag, let go still', hold: 1600, run: () => drag(90, 0, 900)},
    {label: 'arrow right', hold: 900, run: () => key('ArrowRight')},
    {label: 'arrow down', hold: 900, run: () => key('ArrowDown')},
  ];
  window.__tour = steps.map(({label, hold}) => ({label, hold}));
  window.__tourStep = (i) => { steps[i]?.run(); };
}
