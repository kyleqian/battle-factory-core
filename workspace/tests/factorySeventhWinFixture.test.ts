import { describe, expect, it } from 'vitest';
import fixture from '../src/data/gen/factory-seventh-win-timeline-off.json';

describe('Factory seventh-win OFF fixture', () => {
  it('keeps the source-relative award, restore, RNG, and default-NO boundaries consumable', () => {
    expect(fixture.oracleProfile).toBe('battle-scene-off');
    expect(fixture.mutations.battlePoints).toEqual({ tick: 2201, from: 0, to: 3 });
    expect(fixture.printer.getPoints.fanfareCounter).toEqual({ start: 2201, initial: 312, lastNonzero: 2512, firstZero: 2513 });
    expect(fixture.mutations.partyRestore.tick).toBe(3549);
    expect(fixture.mutations.challengeStatusClear.tick).toBe(3549);
    expect(fixture.recordMenu).toMatchObject({ draw: 4422, delayZeroBoundary: 4423, firstAcceptedInput: 4424, defaultChoice: 'NO' });
    expect(fixture.rng.callsPerFrame).toContainEqual({ frames: [4, 4], calls: 4 });
    expect(fixture.staticFramebufferHolds.every((hold) => hold.frames[1] - hold.frames[0] + 1 >= 50)).toBe(true);
  });
});
