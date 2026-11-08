import { describe, expect, it } from 'vitest';
import fixture from './fixtures/data/factory-brain-silver-terminal-off.json';

describe('Factory brain (Noland silver) seventh-win OFF fixture', () => {
  it('live-pins the +10 brain BP bonus, the silver symbol flag, and the default-NO boundaries', () => {
    expect(fixture.oracleProfile).toBe('battle-scene-off');
    expect(fixture.timeline.firstBattlePointMutation).toBe(2701);
    expect(fixture.timeline.silverSymbolFlagStaysSet).toBe(true);
    expect(fixture.timeline.trainerBattleOpponentAStaysBrain).toBe(true);
    expect(fixture.timeline.firstPartyRestore).toBe(4049);
    expect(fixture.timeline.firstChallengeStatusClear).toBe(4049);
    expect(fixture.recordMenuControls.drawFrameRejectedA.nextFrame).toEqual({ menuAlive: true, result: 255 });
    expect(fixture.recordMenuControls.firstAcceptedDefaultNoA.nextFrame).toEqual({ menuAlive: false, result: 1 });
    const trainerOpponentWrite = fixture.construction.writes.find(
      (write) => write.target === 'gTrainerBattleOpponent_A',
    );
    expect(trainerOpponentWrite?.value).toBe(1022);
    const streakWrite = fixture.construction.writes.find(
      (write) => write.target.startsWith('frontier.factoryWinStreaks'),
    );
    expect(streakWrite?.value).toBe(21);
  });
});
