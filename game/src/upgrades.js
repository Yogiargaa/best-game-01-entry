// The upgrades offered between waves: three cards, one choice, and the choice
// matters — damage, speed, extra bolts, bloom care and two new powers. Each
// definition knows its own stacking limit and how it changes the run.

export const UPGRADES = [
  {
    id: 'swift',
    name: 'Swift Wick',
    icon: 'bolt',
    desc: 'Shoot 28% faster. Your lantern flickers with hurry.',
    max: 4,
    apply(stats) {
      stats.fireInterval *= 0.72;
    },
  },
  {
    id: 'bright',
    name: 'Bright Core',
    icon: 'star',
    desc: '+1 damage on every bolt. The light bites deeper.',
    max: 5,
    apply(stats) {
      stats.boltDamage += 1;
    },
  },
  {
    id: 'stride',
    name: 'Long Stride',
    icon: 'wind',
    desc: 'Move 15% faster. The garden feels smaller underfoot.',
    max: 3,
    apply(stats) {
      stats.speed *= 1.15;
    },
  },
  {
    id: 'twin',
    name: 'Twin Lantern',
    icon: 'lantern',
    desc: '+1 bolt per shot, side by side. Twice the dawn.',
    max: 2,
    apply(stats) {
      stats.boltCount += 1;
    },
  },
  {
    id: 'pierce',
    name: 'Piercing Rays',
    icon: 'arrow',
    desc: 'Bolts pass through +1 enemy. Nothing hides behind the front rank.',
    max: 3,
    apply(stats) {
      stats.pierce += 1;
    },
  },
  {
    id: 'sturdy',
    name: 'Sturdy Wick',
    icon: 'heart',
    desc: '+1 max heart, and mend one heart now.',
    max: 3,
    apply(stats, world) {
      world.player.maxHearts = Math.min(6, world.player.maxHearts + 1);
      world.player.hearts = Math.min(world.player.maxHearts, world.player.hearts + 1);
    },
  },
  {
    id: 'mend',
    name: 'Bloom Mend',
    icon: 'bloom',
    desc: 'Mend every bloom for 25, and wake one fallen bloom at half health.',
    max: 99,
    apply(stats, world) {
      let revived = false;
      for (const bloom of world.blooms) {
        if (bloom.hp <= 0 && !revived) {
          bloom.hp = Math.floor(bloom.maxHp / 2);
          revived = true;
        } else if (bloom.hp > 0) {
          bloom.hp = Math.min(bloom.maxHp, bloom.hp + 25);
        }
      }
    },
  },
  {
    id: 'dash',
    name: 'Quick Dash',
    icon: 'dash',
    desc: 'Dash recharges 30% faster. Blink and you are elsewhere.',
    max: 3,
    apply(stats) {
      stats.dashCooldown *= 0.7;
    },
  },
  {
    id: 'magnet',
    name: 'Wide Net',
    icon: 'magnet',
    desc: 'Pickups drift to you from 60% further away.',
    max: 2,
    apply(stats) {
      stats.magnetRadius *= 1.6;
    },
  },
  {
    id: 'ember',
    name: 'Ember Trail',
    icon: 'ember',
    desc: 'Dashing leaves embers that burn enemies standing in them.',
    max: 1,
    apply(stats) {
      stats.emberTrail = true;
    },
  },
  {
    id: 'starfall',
    name: 'Starfall',
    icon: 'starfall',
    desc: 'Every 6s a star strikes the densest cluster of foes. Further takes fall faster.',
    max: 3,
    apply(stats) {
      stats.starfall = true;
      stats.starfallInterval = Math.max(3, (stats.starfallInterval || 6) - 1.2);
    },
  },
  {
    id: 'secondwind',
    name: 'Second Wind',
    icon: 'phoenix',
    desc: 'Once this run, a fatal blow leaves you standing with one heart.',
    max: 1,
    apply(stats) {
      stats.secondWind = true;
    },
  },
];

/** Three distinct upgrades the run can still take, drawn at random. */
export function rollUpgrades(random, taken) {
  const available = UPGRADES.filter((def) => (taken[def.id] ?? 0) < def.max);
  const picks = [];
  const pool = available.slice();
  while (picks.length < 3 && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
}

/** Apply an upgrade's effect and record that the run has taken it. */
export function applyUpgrade(def, stats, world, taken) {
  def.apply(stats, world);
  taken[def.id] = (taken[def.id] ?? 0) + 1;
}
