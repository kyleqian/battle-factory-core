import { describe, expect, it } from 'vitest';
import fixture from './fixtures/data/factory-seventh-win-tail-off.json';

describe('Factory seventh-win OFF tail fixture (record answer -> farewell -> free control)', () => {
  it('pins the NO tail ticks', () => {
    const c = fixture.cases.no;
    expect(fixture.oracleProfile).toBe('battle-scene-off');
    expect(fixture.menuDraw).toBe(4422);
    expect(c.recordResultAfterAnswer).toBe(1);
    expect([c.menuGoneTick, c.printerStartTicks, c.printerIdleTicks]).toEqual([4425, [4425], [4462]]);
    expect([c.scriptShutdownTick, c.firstAvatarRunningStateTick, c.firstPlayerPositionChangeTick]).toEqual([4466, 4467, 4475]);
  });

  it('pins the YES tail ticks', () => {
    const c = fixture.cases.yes;
    expect(c.recordResultAfterAnswer).toBe(0);
    expect([c.menuGoneTick, c.printerStartTicks, c.printerIdleTicks]).toEqual([4431, [4449, 4505], [4501, 4542]]);
    expect([c.scriptShutdownTick, c.firstAvatarRunningStateTick, c.firstPlayerPositionChangeTick]).toEqual([4546, 4547, 4555]);
  });

  it('shares the farewell held frame and the box-gone frame across answers', () => {
    const held = (c: typeof fixture.cases.no) => c.framebufferSpans.find((s) => s.state.printerActive === 0 && s.start > 4440 && s.state.sha256 === 'def8396773a1');
    const gone = (c: typeof fixture.cases.no) => c.framebufferSpans.find((s) => s.state.sha256 === 'cd880b376315');
    expect(held(fixture.cases.no)).toBeDefined();
    expect(held(fixture.cases.yes)).toBeDefined();
    expect(gone(fixture.cases.no)?.start).toBe(4467);
    expect(gone(fixture.cases.yes)?.start).toBe(4547);
  });
});
