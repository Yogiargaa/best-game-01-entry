// Keyboard and pointer input. Held keys give a movement vector; one-shot presses
// (confirm, pause, dash, mute, upgrade picks) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.
// The pointer position is reported in field coordinates through the view
// transform the renderer hands over after every resize.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;
export const ACTION_PICK_1 = 16;
export const ACTION_PICK_2 = 32;
export const ACTION_PICK_3 = 64;
export const ACTION_RESTART = 128;

const MOVE_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  let firing = false;
  let pointerClient = { x: 0, y: 0 };
  let pointerSeen = false;
  let clickPoint = null;
  let view = { scale: 1, ox: 0, oy: 0 };

  function press(event) {
    if (MOVE_KEYS.has(event.code)) {
      held.add(event.code);
      event.preventDefault();
      return;
    }
    if (event.repeat) return;
    switch (event.code) {
      case 'Space':
      case 'Enter':
        actions |= ACTION_CONFIRM;
        if (event.code === 'Space') firing = true;
        event.preventDefault();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        actions |= ACTION_DASH;
        break;
      case 'KeyP':
      case 'Escape':
        actions |= ACTION_PAUSE;
        break;
      case 'KeyM':
        actions |= ACTION_MUTE;
        break;
      case 'KeyR':
        actions |= ACTION_RESTART;
        break;
      case 'Digit1':
      case 'Numpad1':
        actions |= ACTION_PICK_1;
        break;
      case 'Digit2':
      case 'Numpad2':
        actions |= ACTION_PICK_2;
        break;
      case 'Digit3':
      case 'Numpad3':
        actions |= ACTION_PICK_3;
        break;
      default:
        break;
    }
  }

  function release(event) {
    held.delete(event.code);
    if (event.code === 'Space') firing = false;
  }

  window.addEventListener('keydown', press);
  window.addEventListener('keyup', release);
  // A key released while the tab is hidden never sends keyup: let go of all on blur.
  window.addEventListener('blur', () => {
    held.clear();
    firing = false;
  });
  target.addEventListener('pointermove', (event) => {
    pointerClient = { x: event.clientX, y: event.clientY };
    pointerSeen = true;
  });
  target.addEventListener('pointerdown', (event) => {
    pointerClient = { x: event.clientX, y: event.clientY };
    pointerSeen = true;
    clickPoint = fieldPoint(pointerClient.x, pointerClient.y);
    if (event.button === 2) {
      actions |= ACTION_DASH;
    } else {
      actions |= ACTION_CONFIRM;
      firing = true;
    }
    event.preventDefault();
  });
  target.addEventListener('pointerup', (event) => {
    if (event.button !== 2) firing = false;
  });
  target.addEventListener('pointerleave', () => {
    firing = false;
  });
  target.addEventListener('contextmenu', (event) => event.preventDefault());

  function fieldPoint(clientX, clientY) {
    return { x: (clientX - view.ox) / view.scale, y: (clientY - view.oy) / view.scale };
  }

  return {
    /** The view transform from the renderer: field = (client - offset) / scale. */
    setView(next) {
      view = next;
    },
    /** Normalised movement vector from the held keys. */
    move() {
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      return { x, y };
    },
    isFiring() {
      return firing;
    },
    hasPointer() {
      return pointerSeen;
    },
    /** The pointer in field coordinates (the field centre when never moved). */
    aim() {
      if (!pointerSeen) return null;
      return fieldPoint(pointerClient.x, pointerClient.y);
    },
    /** The last click in field coordinates, taken once. */
    takeClick() {
      const point = clickPoint;
      clickPoint = null;
      return point;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
