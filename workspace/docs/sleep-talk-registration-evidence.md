# Sleep Talk registration evidence (Battle Scene OFF)

This checkpoint banks the two commands needed for a real
`BattleScript_EffectSleepTalk`; it does not register or implement either.

`trychoosesleeptalkmove` encodes as `0xa9` plus the four-byte relocated
`BattleScript_SleepTalkUsingMove` pointer. It advances five bytes when every
slot is unusable; otherwise it calls `Random()` until `MOD(random, 4)` names
a usable slot, installs `gCalledMove`, `gCurrMovePos`, and the called move's
target, then sets the PC to that pointer. Its source exclusions are NONE,
Sleep Talk, Assist, Mirror Move, Metronome, Focus Punch, Uproar, and every
two-turn effect, followed by `CheckMoveLimitations(..., ~MOVE_LIMITATION_PP)`.
That final mask deliberately does not reject an empty-PP called slot.

`jumptocalledmove TRUE` encodes as `0x63 0x01`. TRUE copies only
`gCalledMove` to `gCurrentMove`; `gChosenMove` remains Sleep Talk. The command
then directly replaces the PC with the called move's effect script. It makes
no script-stack push and has no return route: the called effect reaches its
normal `BattleScript_MoveEnd` / `end` boundary. Sleep Talk first deducts its
own PP, sets `HITMARKER_NO_PPDEDUCT`, and therefore leaves the called move's
PP intact.

`mechanic-sleep-talk-whiscash-spore-off.json` supplies complete legal
three-mon parties. Its player is the real Level-50 Factory carrier
`FRONTIER_MON_WHISCASH_3`'s exact `SLEEP TALK / REST / SURF / FISSURE` move
array and source nature/defensive EV spread; its held item is intentionally
zero rather than the source Chesto Berry so real opponent Spore can stage the
required sleep. The opponent's four Spore slots constrain normal Factory AI
without injecting a decision. The player first selects Sleep Talk awake
(PP 10→9 and `But it failed!`), Parasect really Spore-sleeps it, then a later
Sleep Talk selects Fissure (PP 9→8, Fissure PP stays 5) and KOs Parasect.

The final OFF runs were replayed twice; both full manifests hash to
`6cc123e5678ee3f620ef1d2b406d6872597d06a3e777c31991104fed2d122c3b`.
The battle-lab manifest exposes current move, PP, status, HP, and RNG values,
but not the script PC/stack, `gCalledMove`, `gChosenMove`, `gCurrMovePos`,
messages, or individual `Random()` attribution. Those hidden facts above are
therefore source-pinned rather than claimed as oracle-observed RAM fields.
