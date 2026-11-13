# The AI scored Foresight with one random roll for a Ghost-type user; the game makes two (fix 41)

Found by the fifth pass's finer tally (`rule-coverage.md`): the branch had never run in any battle that matched the ROM,
and reading it against the game's script showed a difference.

## What was wrong for the game

When the trainer AI scores its own Foresight (or Odor Sleuth) and the Pokemon that would use it is a Ghost type, the
game rolls a random number, and when that roll is 80 or more (176 of 256) it rolls a second one. The move gets +2 only
when both rolls are 80 or more. The engine rolled once and gave +2 when that one roll was 80 or more.

So in the engine the AI liked Foresight too often in that case (176 of 256 instead of 121 of 256), and, more
important, it took one random number too few in 176 of 256 cases. Every random number of the battle after that point
was then a different one: the same battle would go on differently in the engine and on the ROM.

Where a player can meet it: the AI scripts with this check run from the fifth challenge on and for Noland. The only
sets with Foresight that such an opponent can have are Noland's silver Machoke (set 283) and Hitmonlee (set 338), both
Fighting types. They are Ghost types only after the player moved Color Change to them (Kecleon 325's Skill Swap) and
hit them with a Ghost move. Rare. No generated battle did it.

## C source

`data/battle_ai_scripts.s:1940-1963`, the build the ROM ships (the `#else` arm):

    AI_CV_Foresight:
        get_user_type1
        if_equal TYPE_GHOST, AI_CV_Foresight2
        get_user_type2
        if_equal TYPE_GHOST, AI_CV_Foresight2
        if_stat_level_more_than AI_USER, STAT_EVASION, 8, AI_CV_Foresight3
        score -2
        goto AI_CV_Foresight_End
    AI_CV_Foresight2:
        if_random_less_than 80, AI_CV_Foresight_End
    AI_CV_Foresight3:
        if_random_less_than 80, AI_CV_Foresight_End
        score +2
    AI_CV_Foresight_End:
        end

`if_random_less_than` jumps when `Random() % 256` is under its number and goes to the next instruction when it is not
(`Cmd_if_random_less_than`, `src/battle_ai_script_commands.c:663-671`). Nothing stands between the roll of
`AI_CV_Foresight2` (`:1958`) and the label `AI_CV_Foresight3` (`:1959`): no `score`, no `goto`. So a first roll of 80 or
more runs the second roll.

## Engine and fix

`src/engine/factoryAiCheckViability.ts`, `runCvForesight`. Its comment called the two rolls "two mutually exclusive
draw sites", and the code drew once on either path. Now: a Ghost user draws the first roll; under 80 ends with score 0;
else the second roll is drawn (the same one a high-evasion user draws), under 80 ends with score 0, else +2.

## Proof

- Test (fails without the fix): `tests/factoryAiCheckViability.test.ts`, "AI_CV_Foresight ... Ghost user (type1)
  reaches Foresight2's <80 roll, and a roll of 80 or more goes on into Foresight3's roll" and "Ghost user (type2 only)
  also reaches Foresight2": the number of draws, their order and the score for three seeds. Two rows of these tests
  pinned the old behaviour (one draw, +2) and are re-pinned.
- ROM: the staged battle `docs/parity-mac/stages/noland-foresight-ghost.json` (lab seed 79001, silver Noland). Noland
  leads with Machoke 283. The player's Jumpluff 334 puts it to sleep, Kecleon 325 gives it Color Change with Skill
  Swap, Banette 342 hits it with Shadow Ball: Machoke's types are Ghost / Ghost from the fifth decision on, and the AI
  scores its Foresight every turn after that.
  - With the fix: every turn state, every wide state and the winner agree with the ROM (20 of 20 states, to the end
    of the battle).
  - On the engine before the fix: 6 of 21 states. The battle leaves the ROM's in the first turn after the type change:
    the ROM's Machoke uses Foresight and Banette's Screech lowers its Defense (stage 4); in the engine Machoke uses
    Cross Chop and its Defense is not lowered (stage 6), because the engine has drawn one random number fewer.
  - A staged battle made for this: the type change does not happen in generated battles.
