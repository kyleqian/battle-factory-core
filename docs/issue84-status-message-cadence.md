# ISSUES #84(2)/(4) — Scene-OFF status-message cadence receipt

Date/profile: 2026-08-08, `battle-scene-off` (`bin/oracle info`, bootstrap v5).

## Source ownership

The successful volatile scripts have the same direct command tail:

- `BattleScript_EffectTorment`, `battle_scripts_1.s:2139-2150`:
  `printstring STRINGID_PKMNSUBJECTEDTOTORMENT` then
  `waitmessage B_WAIT_TIME_LONG`.
- `BattleScript_EffectTaunt`, `:2308-2319`: the identical shape for
  `STRINGID_PKMNFELLFORTAUNT`.
- `BattleScript_MoveEffectToxic`, `:3917-3921`: `statusanimation
  BS_EFFECT_BATTLER`, then `printstring STRINGID_PKMNBADLYPOISONED`, then the
  same wait. `BattleScript_EffectToxic` (`:686-705`) reaches that subscript via
  `seteffectprimary`, and separately runs `resultmessage` plus its own long
  wait after returning.

`B_WAIT_TIME_LONG` is 64 (`include/constants/battle.h:324`). Scene OFF skips
the visual status animation, but it does not erase the status/controller
request or either interpreter wait. Text still types at one printable glyph
per frame; the 64-frame `waitmessage` begins only after printing completes.

## Fresh dense oracle evidence

The fresh output directories were allocated with `mktemp -d`; no prior oracle
output was reused.

### Opponent MURKROW / TORMENT

Fixture: `tools/battle-lab/scratch-torment-pacing-dense-a-off.json`. Its
declared capture list requests every frame 1040..1260. Fresh manifest:
`/var/folders/wk/mq92yc6s53jfllv0m6rwvydc0000gn/T/poke84-torment.XXXXXX.n6tUYJH9BR/manifest.json`.

- 1052..1075: `Foe MURKROW used TORMENT!` types; the completed attack string
  remains unchanged through 1113 while Scene OFF's attack pause/controller
  path runs.
- 1114: the subjected-to-TORMENT banner's first glyph.
- 1127: the banner is complete (`404f2e…`); every requested 1127..1206 frame
  has that same framebuffer hash.
- 1207: the next action's first glyph (`387a80…`). The 80-frame unchanged tail
  includes the source 64-frame `waitmessage` plus move-end/next-action dispatch.

The acceptance test uses legal rental sets BUTTERFREE 153 and MURKROW 184 and
pins the narrower reusable edge: after the exact printable duration, the
generic round lifecycle must still own the same command at source-wait age 0;
it may retire it only after all 64 wait frames.

These successful result messages are automatic: their scripts contain no
button-dismiss opcode and the generic commands are `advance: automatic`.
This distinguishes their fixed source wait from faint/terminal input gates;
pressing A is neither required nor allowed to shorten the 64-frame hold.

### TOXIC status/controller separation

Fixture: `tools/battle-lab/mechanic-toxic-statusanimation-off.json`. Its
declared capture list requests every frame 200..300. Fresh manifest:
`/var/folders/wk/mq92yc6s53jfllv0m6rwvydc0000gn/T/poke84-toxic.XXXXXX.rYZj3Yfca1/manifest.json`.

- 216..266: the prior completed attack string remains unchanged while the
  source status-animation/controller command is outstanding; status is still
  zero in every requested frame through 266.
- 267: status becomes toxic (`status1=0x80`) and poison text starts typing.
- 294: poison text is complete (`81d6d3…`) and stays unchanged through the
  last requested frame 300. Source then owns the same 64-frame post-print
  wait described above; no unrequested later framebuffer is claimed here.

The public-path sibling uses legal rental sets BUTTERFREE 153 and CLAMPERL 134
with a mechanic-lab-legal no-item Butterfree variant. It proves a typed
`status` command precedes `STRINGID_PKMNBADLYPOISONED`, then checks every
lifecycle age from print completion through the 64-frame source wait.

## Repair boundary

Production presentation now resolves a message's immediate following source
instruction from the event's immutable interpreter `programCounter`. A direct
`B_SCR_OP_WAITMESSAGE B_WAIT_TIME_LONG` selects the shared typed 64-frame
timing family. The rule contains no species, move, battle, turn, or absolute
tick condition; older synthetic receipts without valid provenance retain the
pre-existing message-id fallback. Rules/RNG/events and the fatal completeness
and status-handoff guards are unchanged.
