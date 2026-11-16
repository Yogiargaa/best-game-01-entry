// Boot, the fixed-step loop and the screen state machine: title, playing,
// paused, upgrade offer and the ending. The world advances in fixed 1/60 s steps so
// the game feels the same on every machine; the screens and sounds react to
// the events each step returns. A small debug hook (window.__glowkeeper) lets
// automated checks drive the game into any scene.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, ACTION_PICK_1,
  ACTION_PICK_2, ACTION_PICK_3, ACTION_RESTART, createInput,
} from './input.js';
import { createEffects } from './particles.js';
import {
  EVENT_BLOOM_HURT, EVENT_BLOOM_LOST, EVENT_BOLT_HIT, EVENT_BOSS, EVENT_CLEAR,
  EVENT_DASH, EVENT_HIT, EVENT_KILL, EVENT_OFFER, EVENT_OVER, EVENT_PICKUP,
  EVENT_SHOOT, EVENT_WIN, createWorld,
} from './world.js';
import { createRenderer } from './render.js';
import { createScreens, offerCardRects } from './screens.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam >>> 0 : (Date.now() ^ 0x5f3759df) >>> 0;

const canvas = document.getElementById('game');
const liveRegion = document.getElementById('live');
const input = createInput(canvas);
const audio = createAudio();
const effects = createEffects();
let world = createWorld(createRandom(seed), effects);
const renderer = createRenderer(canvas);
const screens = createScreens(renderer.ctx);

let screen = 'title';
let lastTime = performance.now();
let accumulator = 0;
let overAt = 0;
let isNewBest = false;
let best = loadBest();

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Private mode or no storage: the score still shows for this session.
  }
}

function announce(message) {
  liveRegion.textContent = message;
}

function startRun() {
  audio.unlock();
  audio.startMusic();
  world.reset();
  world.state.best = best;
  world.startWave(1);
  screen = 'playing';
  accumulator = 0;
  isNewBest = false;
  announce('Wave 1. Guard the glowblooms.');
  audio.play('wave');
}

function enterOver() {
  const state = world.state;
  screen = 'over';
  overAt = performance.now();
  audio.stopMusic();
  audio.play(state.won ? 'victory' : 'defeat');
  if (state.score > best) {
    best = state.score;
    isNewBest = true;
    saveBest(best);
  }
  state.best = best;
  announce(state.won
    ? `Dawn breaks. You win with ${state.score} points.`
    : `The light fades. Score ${state.score}. Press space to try again.`);
}

function handleEvents(events) {
  const state = world.state;
  if (events & EVENT_SHOOT) audio.play('shoot');
  if (events & EVENT_BOLT_HIT) audio.play('hit');
  if (events & EVENT_KILL) audio.play('kill');
  if (events & EVENT_HIT) audio.play('hurt');
  if (events & EVENT_DASH) audio.play('dash');
  if (events & EVENT_PICKUP) audio.play('pickup');
  if (events & EVENT_BLOOM_HURT) audio.play('bloomHurt');
  if (events & EVENT_BLOOM_LOST) {
    audio.play('bloomLost');
    const alive = state.blooms.filter((b) => b.hp > 0).length;
    announce(`A glowbloom has wilted. ${alive} ${alive === 1 ? 'bloom' : 'blooms'} left.`);
  }
  if (events & EVENT_BOSS) {
    audio.play('boss');
    announce('The Gloom Queen approaches.');
  }
  if (events & EVENT_CLEAR) {
    announce(`Wave ${state.wave} cleared.`);
  }
  if (events & EVENT_OFFER) {
    audio.play('upgrade');
    announce('Choose a blessing.');
  }
  if (events & EVENT_OVER) {
    enterOver();
  }
}

function hoverCard(point) {
  if (!point) return -1;
  const rects = offerCardRects();
  for (let i = 0; i < rects.length; i += 1) {
    const rect = rects[i];
    if (point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h) {
      return i;
    }
  }
  return -1;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  input.setView(renderer.syncView());
  const actions = input.takeActions();
  const click = input.takeClick();

  if (actions & ACTION_MUTE) {
    const muted = audio.toggleMute();
    announce(muted ? 'Sound off.' : 'Sound on.');
  }

  if (screen === 'title') {
    world.ambient(dt);
    if (actions & ACTION_CONFIRM) startRun();
  } else if (screen === 'playing') {
    if (actions & ACTION_PAUSE) {
      screen = 'paused';
    } else if (actions & ACTION_RESTART) {
      startRun();
    } else {
      accumulator += dt;
      let steps = 0;
      let events = 0;
      const snapshot = {
        move: input.move(),
        firing: input.isFiring(),
        aim: input.aim(),
        dash: (actions & ACTION_DASH) !== 0,
      };
      while (accumulator >= STEP && steps < 8) {
        events |= world.step(STEP, snapshot);
        snapshot.dash = false;
        accumulator -= STEP;
        steps += 1;
      }
      if (steps === 8) accumulator = 0;
      handleEvents(events);
      if (screen === 'playing' && world.state.waveState === 'offer') {
        screen = 'offer';
      }
    }
  } else if (screen === 'paused') {
    if (actions & ACTION_PAUSE) {
      screen = 'playing';
      accumulator = 0;
    } else if (actions & ACTION_RESTART) {
      startRun();
    }
  } else if (screen === 'offer') {
    const state = world.state;
    let pick = -1;
    if (actions & ACTION_PICK_1) pick = 0;
    else if (actions & ACTION_PICK_2) pick = 1;
    else if (actions & ACTION_PICK_3) pick = 2;
    if (pick === -1 && click) pick = hoverCard(click);
    if (pick >= 0 && pick < state.offered.length) {
      const def = state.offered[pick];
      world.grantUpgrade(def);
      audio.play('click');
      world.startWave(state.wave + 1);
      announce(`Wave ${state.wave}. ${def.name} chosen.`);
      audio.play('wave');
      screen = 'playing';
      accumulator = 0;
    }
    effects.step(dt);
  } else if (screen === 'over') {
    effects.step(dt);
    if ((actions & ACTION_CONFIRM) && now - overAt > 800) startRun();
  }

  draw();
}

function draw() {
  const state = world.state;
  renderer.drawWorld(state, effects);
  if (screen === 'title') {
    screens.drawTitle(best, audio.isMuted(), state.time);
  } else if (screen === 'playing' || screen === 'paused') {
    screens.drawHud(state, {
      enemiesLeft: world.enemiesLeft(),
      bossFraction: world.bossFraction(),
      multiplier: world.multiplier(),
      muted: audio.isMuted(),
    });
    screens.drawBanner(state.banner, state.time);
    if (screen === 'paused') screens.drawPause(audio.isMuted());
  } else if (screen === 'offer') {
    screens.drawHud(state, {
      enemiesLeft: world.enemiesLeft(),
      bossFraction: world.bossFraction(),
      multiplier: world.multiplier(),
      muted: audio.isMuted(),
    });
    screens.drawOffer(state.offered, hoverCard(input.aim()), state.time);
  } else if (screen === 'over') {
    screens.drawEnd(state, state.won, best, isNewBest);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'playing') screen = 'paused';
});

// Shot mode (?shot=<scene>&seed=<n>) stages one deterministic scene, paints it
// twice and sets window.__shotReady, so a screenshot is a real render of the
// game's own code at a fixed simulated time.
function runShot(name) {
  const scene = stageShot(name, world);
  const state = world.state;
  state.best = scene.screen === 'title' ? 0 : state.score;
  let painted = 0;
  function paint() {
    renderer.drawWorld(state, effects);
    if (scene.screen === 'title') {
      screens.drawTitle(0, audio.isMuted(), state.time);
    } else if (scene.screen === 'playing') {
      screens.drawHud(state, {
        enemiesLeft: world.enemiesLeft(),
        bossFraction: world.bossFraction(),
        multiplier: world.multiplier(),
        muted: audio.isMuted(),
      });
      screens.drawBanner(state.banner, state.time);
    } else {
      screens.drawEnd(state, state.won, state.score, false);
    }
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shotName) {
  runShot(shotName);
} else {
  world.reset();
  world.state.best = best;
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Debug hook for automated checks and screenshots. It only ever drives the
// same public functions a player reaches through the screens above.
// ---------------------------------------------------------------------------
window.__glowkeeper = {
  screen: () => screen,
  state: () => world.state,
  start(seed = 1234) {
    world = createWorld(createRandom(seed >>> 0), effects);
    world.reset();
    world.state.best = best;
    startRun();
    return world.state;
  },
  /** Run the simulation forward with a simple autopilot at the controls. */
  autoplay(seconds, seed = 1234) {
    const state = world.state;
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps && !state.over; i += 1) {
      let target = null;
      let bestDistance = Infinity;
      for (const e of state.enemies) {
        if (!e.active) continue;
        const dx = e.x - state.player.x;
        const dy = e.y - state.player.y;
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance) {
          bestDistance = distance;
          target = e;
        }
      }
      const move = { x: 0, y: 0 };
      if (target) {
        const dx = target.x - state.player.x;
        const dy = target.y - state.player.y;
        const distance = Math.hypot(dx, dy) || 1;
        // Keep a little distance: close in when far, back off when close.
        const sign = distance > 240 ? 1 : distance < 130 ? -1 : 0;
        move.x = (dx / distance) * sign;
        move.y = (dy / distance) * sign;
      }
      const events = world.step(STEP, {
        move,
        firing: true,
        aim: target ? { x: target.x, y: target.y } : null,
        dash: false,
      });
      handleEvents(events);
      // Stop at an upgrade offer: the caller decides what to pick.
      if (state.waveState === 'offer') break;
    }
    return state;
  },
  /** Put the game into a named scene for screenshots. */
  scene(name) {
    this.start(1234);
    if (name === 'title') {
      screen = 'title';
      world.reset();
      world.state.best = best;
      return world.state;
    }
    if (name === 'combat') {
      this.autoplay(14);
      screen = 'playing';
      return world.state;
    }
    if (name === 'offer') {
      for (let t = 0; t < 150; t += 5) {
        this.autoplay(5);
        if (world.state.waveState === 'offer' || world.state.over) break;
      }
      if (world.state.waveState === 'offer') screen = 'offer';
      return world.state;
    }
    if (name === 'boss') {
      world.reset();
      world.state.best = best;
      world.startWave(10);
      screen = 'playing';
      this.autoplay(8);
      return world.state;
    }
    if (name === 'over') {
      world.state.player.hearts = 0;
      world.state.over = true;
      enterOver();
      return world.state;
    }
    if (name === 'win') {
      world.state.won = true;
      world.state.over = true;
      world.state.score = 12480;
      enterOver();
      return world.state;
    }
    return world.state;
  },
};
