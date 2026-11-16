// The screenshot scenes behind ?shot=title|play|boss|victory|over. Each one
// plays the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot (shoot the nearest foe, keep a fighting
// distance, strafe, sidestep globs, dash out of trouble), so every frame is
// what a real game looks like and the same seed always stages the same scene.
// The autopilot's choices come only from the world state, never from the wall
// clock, so a scene is repeatable run after run.

import { GROVE, STEP } from './config.js';

const TITLE_SECONDS = 5;
const BOSS_SECONDS = 15;
const RUN_LIMIT_SECONDS = 600;

/** The order a careful keeper values blessings in, best first. */
const UPGRADE_PRIORITY = [
  'twin', 'bright', 'swift', 'starfall', 'pierce', 'secondwind',
  'sturdy', 'dash', 'mend', 'stride', 'ember', 'magnet',
];

/** The best offered blessing for the run's current state. */
function pickUpgrade(offered, state) {
  let best = offered[0];
  let bestRank = Infinity;
  for (const def of offered) {
    let rank = UPGRADE_PRIORITY.indexOf(def.id);
    if (rank === -1) rank = UPGRADE_PRIORITY.length;
    // A hurt garden moves Bloom Mend to the front of the queue.
    if (def.id === 'mend' && state.blooms.some((b) => b.hp < b.maxHp * 0.6)) rank = -1;
    if (rank < bestRank) {
      bestRank = rank;
      best = def;
    }
  }
  return best;
}

/**
 * The autopilot: aim at the nearest foe and keep firing; hold a fighting
 * distance from it, strafe sideways, drift back toward the grove when pushed
 * far out, sidestep a glob flying at the player, and dash when something gets
 * too close. `skill` scales how well it does all of that: the victory scene's
 * pilot plays carefully, the game-over scene's barely moves at all.
 */
export function autopilot(state, skill) {
  const player = state.player;
  let target = null;
  let bestDistance = Infinity;
  for (const e of state.enemies) {
    if (!e.active) continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      target = e;
    }
  }
  const move = { x: 0, y: 0 };
  let dash = false;
  if (target && skill > 0) {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.hypot(dx, dy) || 1;
    const near = 170;
    const far = 290;
    const toward = distance > far ? 1 : distance < near ? -1 : 0;
    move.x += (dx / distance) * toward;
    move.y += (dy / distance) * toward;
    // Strafe, flipping side every second and a half.
    const strafe = Math.floor(state.time / 1.5) % 2 === 0 ? 1 : -1;
    move.x += (-dy / distance) * strafe * 0.7;
    move.y += (dx / distance) * strafe * 0.7;
    if (distance < 70 && player.dashCooldownLeft <= 0) dash = true;
  }
  // A hurt keeper detours for a heart lying nearby.
  if (skill > 0 && player.hearts < player.maxHearts) {
    let heart = null;
    let heartDistance = 420;
    for (const pickup of state.pickups) {
      if (!pickup.active || pickup.kind !== 'heart') continue;
      const distance = Math.hypot(pickup.x - player.x, pickup.y - player.y);
      if (distance < heartDistance) {
        heartDistance = distance;
        heart = pickup;
      }
    }
    if (heart) {
      move.x += ((heart.x - player.x) / (heartDistance || 1)) * 1.4;
      move.y += ((heart.y - player.y) / (heartDistance || 1)) * 1.4;
    }
  }
  // Sidestep a glob headed for the player.
  if (skill > 0.5) {
    for (const glob of state.globs) {
      if (!glob.active) continue;
      const dx = player.x - glob.x;
      const dy = player.y - glob.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 90) {
        const closing = dx * glob.vx + dy * glob.vy;
        if (closing > 0) {
          move.x += (-dy / (distance || 1)) * 1.2;
          move.y += (dx / (distance || 1)) * 1.2;
        }
      }
    }
  }
  // Drift home when pushed far from the grove: the blooms are the point.
  const homeDx = GROVE.x - player.x;
  const homeDy = GROVE.y - player.y;
  const homeDistance = Math.hypot(homeDx, homeDy);
  if (homeDistance > 280 && skill > 0) {
    move.x += (homeDx / homeDistance) * 0.8;
    move.y += (homeDy / homeDistance) * 0.8;
  }
  const length = Math.hypot(move.x, move.y);
  if (length > 1) {
    move.x /= length;
    move.y /= length;
  }
  return {
    move,
    firing: skill > 0,
    aim: target ? { x: target.x, y: target.y } : null,
    dash,
  };
}

function runFor(world, seconds, skill) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.state.over) break;
    world.step(STEP, autopilot(world.state, skill));
    if (world.state.waveState === 'offer') {
      world.grantUpgrade(pickUpgrade(world.state.offered, world.state));
      world.startWave(world.state.wave + 1);
    }
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Unknown names stage the title. The world is always reset first, so a scene
 * never inherits anything from a previous one.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // Mid-run, mid-wave: several kinds converging on the grove at once.
    for (let i = 0; i < 2; i += 1) {
      const offered = world.offerUpgrades();
      if (offered.length > 0) world.grantUpgrade(pickUpgrade(offered, world.state));
    }
    world.state.waveState = 'idle';
    world.startWave(4);
    runFor(world, 12, 1);
    return { screen: world.state.over ? 'over' : 'playing' };
  }
  if (name === 'boss') {
    // A late-run keeper arrives with blessings already earned.
    for (let i = 0; i < 6; i += 1) {
      const offered = world.offerUpgrades();
      if (offered.length > 0) world.grantUpgrade(pickUpgrade(offered, world.state));
    }
    world.state.waveState = 'idle';
    world.startWave(10);
    runFor(world, BOSS_SECONDS, 1);
    return { screen: world.state.over ? 'over' : 'playing' };
  }
  if (name === 'victory') {
    // The victory run starts with a few blessings banked, as a keeper who has
    // already cleared the early waves would, then plays the whole run through.
    for (let i = 0; i < 3; i += 1) {
      const offered = world.offerUpgrades();
      if (offered.length > 0) world.grantUpgrade(pickUpgrade(offered, world.state));
    }
    world.state.waveState = 'idle';
    world.startWave(1);
    runFor(world, RUN_LIMIT_SECONDS, 1);
    return { screen: 'over' };
  }
  if (name === 'over') {
    world.startWave(1);
    // A dazed keeper who never moves and never shoots: the gloom wins.
    runFor(world, RUN_LIMIT_SECONDS, 0);
    return { screen: 'over' };
  }
  for (let i = 0; i < Math.round(TITLE_SECONDS / STEP); i += 1) {
    world.ambient(STEP);
  }
  return { screen: 'title' };
}
