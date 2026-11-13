# A faint cleared the Lock-On mark too early (no effect on play) — fixed

Found by the Metronome sweep (fourth pass): staged battle `stages/metronome-lock-on.json` (real sets, lab seed 50039).

## Symptom

Chansey calls Lock-On through Metronome and faints on the next turn. At the replacement menu the ROM still has the
mark on the opponent (`gStatuses3` bit `STATUS3_ALWAYS_HITS`, value 8: one turn left). The engine had cleared it.

## What it changes for the game

Nothing a player can see. The mark only helps the Pokemon that used Lock-On, and that Pokemon has fainted. The game
removes the mark when the next Pokemon enters that slot. The fix makes the engine's state equal to the game's in
between, so the wide compare can check this point.

## C source

- `FaintClearSetData` (`battle_main.c:3264`): its loop over the other battlers (`:3274-3282`) frees escape
  prevention (Mean Look), infatuation and Wrap that the fainted Pokemon caused. It does not touch `STATUS3_ALWAYS_HITS`.
- `SwitchInClearSetData` (`:3166-3170`): the mark goes when a Pokemon enters the slot of the one that used Lock-On
  (and Baton Pass renews it, `:3178-3187`). The engine already did both.

## Engine and fix

`src/engine/battleScriptHitChainOpcode.ts` (`cleareffectsonfaint`) also cleared the mark and `battlerWithSureHit` on
the other battler. That part is removed.

## Proof and re-pin

- ROM, `stages/metronome-lock-on.json`: before the fix the wide compare stopped at decision 8 (`battlers.1.status3`:
  engine 0, ROM 8). After this fix and fix 38 (the same battle) all 16 turn states and every wide state match.
- `tests/battleScriptHitChainOpcode.test.ts`: the case "faint cleanup clears another battler's sure-hit marker only
  when the fainted battler owns it" pinned the wrong rule. It now reads "faint cleanup leaves another battler's
  sure-hit marker alone, whoever owns it".
