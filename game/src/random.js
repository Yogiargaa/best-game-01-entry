// A small seeded generator (xorshift32 with a Weyl step): the same seed gives the
// same game, which is what makes the screenshot scenes repeatable. The generator
// is a closure over its state; fork() hands out an independent stream for a
// subsystem that must not disturb the main one.

export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  let counter = 0x2545f491;

  function next() {
    counter = (counter + 0x9e3779b9) >>> 0;
    let x = state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    state = x >>> 0;
    return ((state + counter) >>> 0) / 4294967296;
  }

  next.int = function int(bound) {
    return Math.floor(next() * bound);
  };

  next.range = function range(low, high) {
    return low + next() * (high - low);
  };

  next.pick = function pick(list) {
    return list[Math.floor(next() * list.length)];
  };

  next.chance = function chance(probability) {
    return next() < probability;
  };

  next.fork = function fork() {
    return createRandom((state ^ Math.imul(counter, 0x85ebca6b)) >>> 0);
  };

  return next;
}
