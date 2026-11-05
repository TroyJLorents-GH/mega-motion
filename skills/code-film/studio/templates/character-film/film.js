// Character film: a voxel mascot acts its way through a 3D world of app windows. 9:16 or 16:9, about 17 s.
//
// Story (film.json "actions"): a question types into a chat window; the mascot hears it, RUNS off across the desk,
// crashes THROUGH a page that breaks into pieces, catches the file that falls out, runs it to an editor, flings it
// onto the timeline, and the result plays. End card.
//
// Everything is a pure function of t: the mascot's position comes from its run paths and leaps (mascot.js), the
// camera blends shots with closed-form springs (world.js), the shards fly on closed-form arcs (smash.js), and the
// screens redraw from t (panels.js). film.json holds every word, time, colour, position and the sprite itself.
import * as THREE from 'three';
import {boot, clamp, ease, fitFont, lines, reducedMotion, span} from './studio/kit.js';
import {createWorld, createCameraRig, lagged} from './world.js';
import {createActor} from './mascot.js';
import {preflight, createPanels, createCard, timelineLayout} from './panels.js';
import {createShatter} from './smash.js';

const FONTS = ['400 20px "Inter Tight"', '500 20px "Inter Tight"', '600 20px "Inter Tight"', '700 20px "Inter Tight"', '800 20px "Inter Tight"',
  '400 20px "JetBrains Mono"', '500 20px "JetBrains Mono"'];

boot(async (film) => {
  // 1. Refuse to render with anything missing (never a stand-in card).
  await preflight(film);
  await Promise.all(FONTS.map((f) => document.fonts.load(f)));
  const {width: W, height: H, duration: D, content: C, palette: P} = film;
  const RM = reducedMotion();
  const events = [];
  const cue = (t, kind) => t >= 0 && t < D && events.push({t: Number(t.toFixed(3)), kind});
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

  // 2. Stage, renderer, windows.
  const world = createWorld(film, document.getElementById('gl'));
  const {scene} = world;
  const panels = await createPanels(film, scene);
  const roleOf = (role) => panels.list.find((p) => p.spec.role === role || p.kind === role);
  const chat = roleOf('chat');
  const docP = panels.byId[film.smash?.panel] || roleOf('doc');
  const editor = roleOf('editor');

  // 3. The actor. Camera keys may follow him, and he may face the camera: position never depends on facing.
  const wide = W / H > 1;
  const camKeys = (wide && film.camera.keysWide) || film.camera.keys;
  let actor;
  const heroPos = (t) => {
    const l = actor.locomotion(t);
    return new THREE.Vector3(l.x, l.lift * 0.3, l.z);
  };
  // A smoothed follow with no visible lag: a critically damped filter trails by 2/omega seconds, so read it that far
  // ahead (positions are pure functions of t, so the future is known).
  const fOmega = film.camera.followOmega ?? 4.5;
  const smoothHero = lagged(heroPos, fOmega, 1.6);
  const follow = (t) => smoothHero(t + 2 / fOmega);
  const shakes = [];
  let rig = createCameraRig(film, camKeys, follow, {shakes});
  const camPos = (t) => rig.pose(t).pos;
  const acts = [...film.actions];
  actor = createActor(film.mascot, acts, {camPos});

  // 4. Derive the crash: when and where his leap crosses the page (edit the leap, the break follows).
  let hit = null;
  if (docP) {
    const n = docP.normal();
    const o = docP.at(0, 0, 0);
    // his FRONT face meets the page (not his centre), so he is never seen half through an unbroken page
    const front = actor.rig.depthUnits / 2 + 0.04;
    const sd = (t) => {
      const l = actor.locomotion(t);
      const fwd = new THREE.Vector3(Math.sin(l.heading ?? 0), 0, Math.cos(l.heading ?? 0));
      return new THREE.Vector3(l.x, 0, l.z).addScaledVector(fwd, front).sub(o).dot(n);
    };
    for (let t = 0; t < D; t += 1 / 480) {
      if (sd(t) < 0 && sd(t + 1 / 480) >= 0) {
        const l = actor.locomotion(t);
        const p = new THREE.Vector3(l.x, l.lift + actor.height * 0.5, l.z);
        // page coordinates of the impact
        docP.group.updateMatrixWorld(true);
        const loc = docP.group.worldToLocal(p.clone());
        const uv = [(loc.x + docP.sw / 2) / docP.sw, (loc.y - (docP.h / 2 - docP.sh / 2)) / docP.sh];
        if (uv[0] < -0.05 || uv[0] > 1.05 || uv[1] < -0.05 || uv[1] > 1.05) continue;
        const l2 = actor.locomotion(t + 0.02);
        hit = {t: t - 0.01, point: p, uv: uv.map((x) => clamp(x, 0.05, 0.95)), dir: new THREE.Vector3(l2.x - l.x, 0, l2.z - l.z).normalize()};
        break;
      }
    }
    if (!hit) throw new Error(`smash: the mascot never crosses panel "${docP.id}" from behind. Move a leap or run so it passes through the page.`);
    acts.push({do: 'crash', at: hit.t});
    actor = createActor(film.mascot, acts, {camPos});
    if (!RM) shakes.push({t: hit.t, amp: film.smash?.shake ?? 0.09, decay: 0.2});
  }
  const leapLand = actor.moves.filter((m) => m.kind === 'leap' && m.verb === 'leap').map((m) => m.t1);
  if (!RM) for (const t of leapLand) shakes.push({t, amp: 0.035, decay: 0.12});
  rig = createCameraRig(film, camKeys, follow, {shakes});
  scene.add(actor.rig.root);
  const shatter = docP && hit ? createShatter(docP, hit, scene, {seed: film.smash?.seed ?? 7, force: film.smash?.force ?? 1}) : null;

  // 5. The file card: flush in the page, freed by the break, caught, carried, flung onto the timeline.
  const grab = film.actions.find((a) => a.do === 'grab');
  const toss = film.actions.find((a) => a.do === 'toss');
  const cardSpec = film.card || {};
  const card = createCard(film, cardSpec);
  scene.add(card.group);
  const embedded = cardSpec.embedded ?? !docP?.spec.capture;
  const cardHome = docP && !embedded && hit ? docP.at(hit.uv[0], Math.min(0.9, hit.uv[1] + 0.12), card.depth / 2 + 0.004) : docP ? docP.at(cardSpec.at?.[0] ?? 0.5, cardSpec.at?.[1] ?? 0.55, card.depth / 2 + 0.004) : new THREE.Vector3();
  const qHome = docP ? docP.quaternion() : new THREE.Quaternion();
  // dock: the slot on the editor's timeline
  let dockAt = null;
  let qDock = null;
  let dockT = null;
  let clipSize = new THREE.Vector2(0.4, 0.1);
  if (editor && editor.overlays.timeline && toss) {
    const o = editor.overlays.timeline;
    const L = timelineLayout(o);
    const r = o.rect;
    const u = r.x + (L.slot.x + L.slot.w / 2) * r.w;
    const v = 1 - (r.y + (L.slot.y + L.slot.h / 2) * r.h);
    dockAt = editor.at(u, v, 0.015);
    clipSize = new THREE.Vector2(L.slot.w * r.w * editor.sw, L.slot.h * r.h * editor.sh);
    qDock = editor.quaternion();
    dockT = toss.at + (cardSpec.flight ?? 0.62);
  }
  const releaseT = hit ? hit.t + 0.03 : 0;
  const ballistic = (p0, p1, T, apex) => {
    // closed form: start, end and flight time fixed; gravity chosen so the arc peaks `apex` above the chord
    const g = (8 * apex) / (T * T);
    const v0 = p1.clone().sub(p0).divideScalar(T);
    v0.y += 0.5 * g * T;
    return (tau) => p0.clone().addScaledVector(v0, tau).add(new THREE.Vector3(0, -0.5 * g * tau * tau, 0));
  };
  // Carried resting on the head, leaned back like a tray, so it clears the face and its label faces up to the lens.
  const LEAN = cardSpec.carryLean ?? 0.95; // radians back from upright
  actor.rig.carryLocal.set(0, actor.height + (card.h / 2) * Math.cos(LEAN) + card.depth, -(card.h / 2) * Math.sin(LEAN) * 0.6);
  const yawToLens = (p, t) => {
    const c = rig.pose(t).pos;
    return Math.atan2(c.x - p.x, c.z - p.z);
  };
  const carryQ = (t) => {
    const s = actor.sample(t);
    const p = actor.carryAt(t);
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(-LEAN + s.pitch * 0.4, yawToLens(p, t), s.roll * 0.5, 'YXZ'));
  };
  // While it falls out of the page it turns face-on to the lens and stays readable (a small wobble, no tumble).
  const fallQ = (t, p) => new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15 + 0.12 * Math.sin((t - releaseT) * 9), yawToLens(p, t), 0.1 * Math.sin((t - releaseT) * 7), 'YXZ'));
  const catchPath = grab && hit ? ballistic(cardHome.clone().addScaledVector(docP.normal(), 0.1), actor.carryAt(grab.at), grab.at - releaseT, 0.55) : null;
  const tossPath = toss && dockAt ? ballistic(actor.carryAt(toss.at), dockAt, dockT - toss.at, cardSpec.tossApex ?? 1.5) : null;
  function placeCard(t) {
    const g = card.group;
    g.visible = true;
    g.scale.set(1, 1, 1);
    if (!hit || t < releaseT) {
      // On a drawn page the card is a section of it; on a real capture it stays hidden (never over the capture's own
      // words) and is born from the hole at the break.
      if (!embedded) {
        g.visible = false;
        return;
      }
      // part of the page: it shudders with it
      g.position.copy(cardHome);
      if (docP.restPos) g.position.add(docP.group.position.clone().sub(docP.restPos));
      g.quaternion.copy(qHome);
      return;
    }
    if (grab && t < grab.at) {
      const u = (t - releaseT) / (grab.at - releaseT);
      const p = catchPath(t - releaseT);
      g.position.copy(p);
      const q = qHome.clone().slerp(fallQ(t, p), ease.enter(span(u, 0, 0.25)));
      g.quaternion.copy(q.slerp(carryQ(grab.at), ease.inOut(span(u, 0.75, 1))));
      return;
    }
    if (!toss || t < toss.at) {
      g.position.copy(actor.carryAt(t));
      g.quaternion.copy(carryQ(t));
      return;
    }
    if (t < dockT) {
      const u = (t - toss.at) / (dockT - toss.at);
      g.position.copy(tossPath(t - toss.at));
      const q = carryQ(toss.at).slerp(qDock, ease.inOut(u));
      // no somersault: the label stays toward the lens the whole flight, so the hero never turns into a blank slab
      g.quaternion.copy(q);
      // it lands flush and shrinks into the clip's exact size over the last frames: a hand-off, not a swap
      const k = ease.inOut(span(u, 0.62, 1));
      g.scale.set(1 + (clipSize.x / card.w - 1) * k, 1 + (clipSize.y / card.h - 1) * k, 1 - 0.7 * k);
      return;
    }
    g.visible = false; // it is now the clip on the timeline
  }

  // 6. Story cues every screen reads (the times come from the actions, not from duplicated numbers).
  const playT = dockT !== null ? dockT + (film.editor?.playDelay ?? 0.45) : undefined;
  const doneT = playT !== undefined ? playT + (film.editor?.renderSeconds ?? 1.9) : undefined;
  const cues = {dock: dockT ?? undefined, play: playT, done: doneT, smash: hit ? {t: hit.t, uv: hit.uv} : null};

  // 7. Type layer: the end card (masked line reveals), drawn in the DOM so it stays razor sharp.
  const type = document.getElementById('type');
  const E = C.end || {};
  const endBox = document.createElement('div');
  endBox.className = 'end';
  type.appendChild(endBox);
  const kicker = document.createElement('div');
  kicker.className = 'kicker';
  kicker.textContent = E.kicker || '';
  endBox.appendChild(kicker);
  const endLines = lines(endBox, E.lines || ['Notes in.', 'Film out.'], 'display');
  const ML = Math.round(W * (film.safe?.left ?? 0.06) + W * 0.02);
  const CW = Math.round(W * (1 - (film.safe?.right ?? 0.06)) - ML - W * 0.04);
  fitFont(endLines, wide ? CW * 0.5 : CW, {max: wide ? 150 : 210});
  endBox.style.left = `${ML}px`;
  endBox.style.top = `${Math.round(H * ((film.safe?.top ?? 0.06) + 0.025))}px`;
  const endIn = E.at ?? D - 3.4;
  const endLineEls = [...endLines.querySelectorAll('.line-inner')];

  // 8. Sound cues, from the same timeline.
  const q = C.chat?.question;
  if (q) {
    cue(q.at - 0.15, 'pop');
    for (let i = 2; i < q.text.length; i += 3) cue(q.at + i / (q.cps ?? 26), 'type');
  }
  const rp = C.chat?.reply;
  if (rp) cue(rp.at, 'blip');
  for (const m of actor.moves) {
    if (m.kind === 'run' && !m.flowIn) cue(m.t0 - 0.05, 'whoosh');
    if (m.kind === 'leap') cue(m.t0, m.verb === 'leap' ? 'leap' : 'hop'), cue(m.t1, 'land');
  }
  actor.footfalls().forEach((t, i) => i % 2 === 0 && cue(t, 'step'));
  if (hit) {
    cue(hit.t - 0.16, 'crack');
    cue(hit.t, 'smash');
    cue(hit.t + 0.45, 'debris');
  }
  for (const l of C.terminal?.lines || []) cue(l.at, 'key');
  if (grab) cue(grab.at, 'catch');
  if (toss) cue(toss.at, 'toss');
  if (dockT) cue(dockT, 'dock');
  (C.editor?.clips || []).forEach((_, i) => dockT && cue(dockT + 0.14 + i * 0.09, 'tick'));
  if (playT) cue(playT, 'play');
  if (doneT) cue(doneT, 'done');
  cue(endIn, 'end');
  window.EVENTS = events.sort((a, b) => a.t - b.t);

  const show = (el, on) => (el.style.display = on ? '' : 'none');

  // 9. One frame.
  return (t) => {
    // the mascot
    actor.apply(actor.sample(t));
    // windows and their live screens
    panels.update(t, {cues, mascot: film.mascot, card: cardSpec});
    if (shatter) shatter.update(t);
    placeCard(t);
    // camera
    const c = rig.pose(t);
    const cam = world.camera;
    cam.position.copy(c.pos);
    cam.fov = c.fov;
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
    cam.lookAt(c.look);
    if (world.dof) {
      const s = actor.sample(t);
      const focusP = new THREE.Vector3(s.x, s.y + actor.height * 0.55, s.z);
      // focus on the hero; while a screen is the hero (it plays), rack to the screen
      let fd = cam.position.distanceTo(focusP);
      if (playT !== undefined && editor) {
        const scr = cam.position.distanceTo(editor.at(0.5, 0.62, 0));
        fd += (scr - fd) * ease.inOut(span(t, playT - 0.6, playT)) * (1 - ease.inOut(span(t, endIn - 0.6, endIn + 0.2)));
      }
      world.dof.uniforms.focus.value = fd;
    }
    world.finish.uniforms.uSeed.value = (Math.round(t * film.fps) % 97) * 0.731;
    world.composer.render();

    // end card
    const on = t >= endIn - 0.05;
    show(endBox, on);
    if (on) {
      kicker.style.opacity = ease.enter(span(t, endIn, endIn + 0.4));
      kicker.style.transform = `translateY(${(1 - ease.enter(span(t, endIn, endIn + 0.5))) * 30}px)`;
      endLineEls.forEach((el, i) => {
        const u = ease.enter(span(t, endIn + 0.12 + i * 0.12, endIn + 0.82 + i * 0.12));
        el.style.transform = RM ? 'none' : `translateY(${(1 - u) * 110}%)`;
        el.style.opacity = RM ? u : 1;
      });
    }
  };
});
