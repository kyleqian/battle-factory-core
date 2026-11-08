// bnd255f: the opt-in gamepad helper (src/gamepad.ts) with a fake getGamepads and a manual
// scheduler: edge-only press / release, d-pad + stick, dead zone, first-connected-pad rule,
// disconnect release, and equality with pressing the same sequence directly on a mounted game.
import { afterEach, describe, expect, it } from "vitest";
import { connectGamepad, gamepadButtons, type GamepadLike } from "../src/gamepad.ts";
import type { GbaButton } from "../src/input.ts";
import { mountFactoryGameInternal } from "../src/lib.ts";

interface PadSpec {
  connected?: boolean;
  pressed?: number[];
  axes?: number[];
}

function pad(spec: PadSpec = {}): GamepadLike {
  const pressed = new Set(spec.pressed ?? []);
  return {
    connected: spec.connected ?? true,
    buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: pressed.has(index) })),
    axes: spec.axes ?? [0, 0, 0, 0],
  };
}

function rig(options: { deadZone?: number } = {}) {
  const calls: string[] = [];
  let pads: Array<GamepadLike | null> = [];
  let pending: (() => void) | null = null;
  let scheduled = 0;
  let cancelled = 0;
  const game = {
    press: (button: GbaButton) => calls.push(`+${button}`),
    release: (button: GbaButton) => calls.push(`-${button}`),
  };
  const disconnect = connectGamepad(game, {
    ...options,
    getGamepads: () => pads,
    schedule: (poll) => {
      pending = poll;
      scheduled += 1;
      return () => {
        pending = null;
        cancelled += 1;
      };
    },
  });
  return {
    disconnect,
    calls,
    setPads: (next: Array<GamepadLike | null>) => {
      pads = next;
    },
    /** One animation frame: runs the pending poll. */
    frame: () => {
      const poll = pending;
      pending = null;
      poll?.();
    },
    hasPending: () => pending !== null,
    counts: () => ({ scheduled, cancelled }),
    take: () => calls.splice(0),
  };
}

describe("gamepadButtons mapping", () => {
  it("maps the W3C Standard Gamepad layout to GBA buttons", () => {
    const cases: Array<[number, GbaButton]> = [
      [0, "A"],
      [1, "B"],
      [4, "L"],
      [5, "R"],
      [8, "SELECT"],
      [9, "START"],
      [12, "UP"],
      [13, "DOWN"],
      [14, "LEFT"],
      [15, "RIGHT"],
    ];
    for (const [index, button] of cases) expect([...gamepadButtons(pad({ pressed: [index] }))], `button ${index}`).toEqual([button]);
    // Buttons the GBA has no key for (X, Y, triggers, sticks, home) are ignored.
    expect(gamepadButtons(pad({ pressed: [2, 3, 6, 7, 10, 11, 16] })).size).toBe(0);
  });

  it("reads the left stick past the dead zone as the d-pad, one direction per axis", () => {
    expect([...gamepadButtons(pad({ axes: [0.5, -0.5] }))]).toEqual([]); // on the dead zone is still inside it
    expect([...gamepadButtons(pad({ axes: [0.51, 0] }))]).toEqual(["RIGHT"]);
    expect([...gamepadButtons(pad({ axes: [-0.9, 0] }))]).toEqual(["LEFT"]);
    expect([...gamepadButtons(pad({ axes: [0, -0.9] }))]).toEqual(["UP"]);
    expect([...gamepadButtons(pad({ axes: [0, 0.9] }))]).toEqual(["DOWN"]);
    expect([...gamepadButtons(pad({ axes: [0.9, 0.9] })).values()].sort()).toEqual(["DOWN", "RIGHT"]);
    expect([...gamepadButtons(pad({ axes: [0.3, 0.3] }), 0.2)].sort()).toEqual(["DOWN", "RIGHT"]);
    expect([...gamepadButtons(pad({ axes: [0.9, 0] }), 0.95)]).toEqual([]);
    expect(gamepadButtons({ connected: true, buttons: [], axes: [] }).size).toBe(0);
  });
});

describe("connectGamepad", () => {
  it("presses and releases on edges only", () => {
    const r = rig();
    r.setPads([pad({ pressed: [0] })]);
    r.frame();
    expect(r.take()).toEqual(["+A"]);
    r.frame();
    r.frame(); // held across polls: no repeat press
    expect(r.take()).toEqual([]);
    r.setPads([pad({ pressed: [0, 1] })]);
    r.frame();
    expect(r.take()).toEqual(["+B"]);
    r.setPads([pad({ pressed: [1] })]);
    r.frame();
    expect(r.take()).toEqual(["-A"]);
    r.setPads([pad()]);
    r.frame();
    expect(r.take()).toEqual(["-B"]);
    r.frame();
    expect(r.take()).toEqual([]);
  });

  it("does nothing before a pad appears and does not poll until the scheduler fires", () => {
    const r = rig();
    expect(r.counts()).toEqual({ scheduled: 1, cancelled: 0 });
    r.setPads([]);
    r.frame();
    r.setPads([null, null]);
    r.frame();
    expect(r.calls).toEqual([]);
    expect(r.counts().scheduled).toBe(3); // one poll per frame
  });

  it("drives the d-pad buttons and the stick as one direction set", () => {
    const r = rig();
    r.setPads([pad({ pressed: [12] })]);
    r.frame();
    expect(r.take()).toEqual(["+UP"]);
    // Stick up as well: the same button, so no new edge.
    r.setPads([pad({ pressed: [12], axes: [0, -1] })]);
    r.frame();
    expect(r.take()).toEqual([]);
    // d-pad lets go while the stick still holds UP: still held.
    r.setPads([pad({ axes: [0, -1] })]);
    r.frame();
    expect(r.take()).toEqual([]);
    r.setPads([pad({ axes: [1, 0] })]);
    r.frame();
    expect(r.take().sort()).toEqual(["+RIGHT", "-UP"]);
  });

  it("ignores stick drift inside the dead zone and honours a custom one", () => {
    const r = rig();
    r.setPads([pad({ axes: [0.3, -0.45] })]);
    r.frame();
    expect(r.take()).toEqual([]);
    r.setPads([pad({ axes: [0.55, 0] })]);
    r.frame();
    expect(r.take()).toEqual(["+RIGHT"]);
    r.setPads([pad({ axes: [0.4, 0] })]); // back inside: released, no flutter
    r.frame();
    expect(r.take()).toEqual(["-RIGHT"]);

    const tight = rig({ deadZone: 0.1 });
    tight.setPads([pad({ axes: [0.3, 0] })]);
    tight.frame();
    expect(tight.take()).toEqual(["+RIGHT"]);
  });

  it("follows the first connected pad only (lowest index) and skips disconnected ones", () => {
    const r = rig();
    r.setPads([pad({ connected: false, pressed: [0] }), null, pad({ pressed: [1] }), pad({ pressed: [9] })]);
    r.frame();
    expect(r.take()).toEqual(["+B"]); // index 2: the first connected pad
    // Pad 0 reconnects and takes over: its buttons replace the old pad's.
    r.setPads([pad({ pressed: [0] }), null, pad({ pressed: [1] }), pad({ pressed: [9] })]);
    r.frame();
    expect(r.take().sort()).toEqual(["+A", "-B"]);
    // Input on the other pads is never read.
    r.setPads([pad({ pressed: [0] }), null, pad({ pressed: [1, 4] }), pad({ pressed: [9] })]);
    r.frame();
    expect(r.take()).toEqual([]);
  });

  it("releases everything held when the pad disconnects, and presses again on return", () => {
    const r = rig();
    r.setPads([pad({ pressed: [0, 15], axes: [0, 1] })]);
    r.frame();
    expect(r.take().sort()).toEqual(["+A", "+DOWN", "+RIGHT"]);
    r.setPads([pad({ connected: false, pressed: [0, 15] })]);
    r.frame();
    expect(r.take().sort()).toEqual(["-A", "-DOWN", "-RIGHT"]);
    r.frame();
    expect(r.take()).toEqual([]);
    r.setPads([pad({ pressed: [0] })]);
    r.frame();
    expect(r.take()).toEqual(["+A"]);
    r.setPads([null]); // slot cleared
    r.frame();
    expect(r.take()).toEqual(["-A"]);
  });

  it("the disconnect function releases what it pressed, stops polling, and is idempotent", () => {
    const r = rig();
    r.setPads([pad({ pressed: [0, 9] })]);
    r.frame();
    r.take();
    r.disconnect();
    expect(r.take().sort()).toEqual(["-A", "-START"]);
    expect(r.hasPending()).toBe(false);
    expect(r.counts().cancelled).toBe(1);
    r.frame(); // nothing scheduled: a stray poll is a no-op
    r.disconnect();
    expect(r.take()).toEqual([]);
    expect(r.counts().cancelled).toBe(1);
  });

  it("a poll that fires after disconnect does nothing", () => {
    const calls: string[] = [];
    let poll: (() => void) | null = null;
    const disconnect = connectGamepad(
      { press: (b) => calls.push(`+${b}`), release: (b) => calls.push(`-${b}`) },
      {
        getGamepads: () => [pad({ pressed: [0] })],
        schedule: (fn) => {
          poll = fn;
          return () => undefined; // a scheduler whose cancel is too late
        },
      },
    );
    disconnect();
    poll!();
    expect(calls).toEqual([]);
  });
});

describe("gamepad input equals press / release on the mount", () => {
  const saved = {
    raf: (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame,
    caf: (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame,
  };
  afterEach(() => {
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = saved.raf;
    (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame = saved.caf;
  });

  function fakeCanvas(): HTMLCanvasElement {
    return {
      width: 0,
      height: 0,
      getContext: () => ({
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => undefined,
      }),
    } as unknown as HTMLCanvasElement;
  }

  // One entry per animation frame (16.74 ms): the pad as polled at the start of that frame.
  const SCRIPT: PadSpec[] = [
    {},
    {},
    { pressed: [9] },
    { pressed: [9] },
    {},
    { pressed: [0] },
    {},
    { pressed: [0] },
    { pressed: [0] },
    { pressed: [0] },
    { axes: [1, 0] },
    { axes: [1, 0], pressed: [0] },
    { pressed: [13], axes: [0, 0.2] },
    { pressed: [13, 1] },
    { pressed: [1, 4] },
    { pressed: [8, 5], axes: [-0.8, -0.8] },
    {},
    { connected: false, pressed: [0] },
    {},
    { pressed: [0] },
    {},
    {},
    {},
  ];

  function run(drive: "helper" | "direct"): { frame: number; segments: unknown; trace: unknown } {
    const queue: Array<(time: number) => void> = [];
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (cb: (time: number) => void) => {
      queue.push(cb);
      return queue.length;
    };
    (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame = () => undefined;
    const game = mountFactoryGameInternal({ canvas: fakeCanvas(), battleScene: "off", gameplaySeed: 9 });
    let current: GamepadLike = pad();
    const slot: { poll: (() => void) | null } = { poll: null };
    let disconnect: (() => void) | null = null;
    const direct = new Set<GbaButton>();
    if (drive === "helper") {
      disconnect = connectGamepad(game, {
        getGamepads: () => [current],
        schedule: (fn) => {
          slot.poll = fn;
          return () => {
            slot.poll = null;
          };
        },
      });
    }
    let clock = 0;
    const step = (ms: number): void => {
      clock += ms;
      const pending = queue.splice(0);
      for (const cb of pending) cb(clock);
    };
    step(0);
    for (const spec of SCRIPT) {
      current = pad(spec);
      if (drive === "helper") {
        const fn = slot.poll;
        slot.poll = null;
        fn?.();
      } else {
        const next = current.connected ? gamepadButtons(current) : new Set<GbaButton>();
        for (const button of direct) if (!next.has(button)) game.release(button);
        for (const button of next) if (!direct.has(button)) game.press(button);
        direct.clear();
        for (const button of next) direct.add(button);
      }
      step(1000 / (16_777_216 / 280_896));
    }
    disconnect?.();
    const result = { frame: game.frame, segments: game.sessionTrace().segments, trace: game.trace().map(({ frames, buttons }) => ({ frames, buttons })) };
    game.destroy();
    return result;
  }

  it("a scripted held-button sequence yields the same input stream as direct press / release", () => {
    const viaHelper = run("helper");
    const viaDirect = run("direct");
    expect(viaHelper.frame).toBe(SCRIPT.length);
    expect(viaHelper.segments).toEqual(viaDirect.segments);
    expect(viaHelper.trace).toEqual(viaDirect.trace);
    // The stream is non-trivial: it carries real buttons, including a stick-driven direction.
    const buttons = new Set((viaHelper.segments as Array<{ buttons: string[] }>).flatMap((s) => s.buttons));
    expect([...buttons].sort()).toEqual(["A", "B", "DOWN", "L", "R", "RIGHT", "SELECT", "START", "UP", "LEFT"].sort());
  });
});
