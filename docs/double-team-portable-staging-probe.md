# DOUBLE TEAM portable staging probe (Battle Scene ON)

This is a synthetic presentation-seam construction, not a Factory-legality
claim. It stages the opposite battler side from canonical turn 1 and compares
the complete clone plus evasion-banner body without retaining oracle pixels.

## Construction and source shape

`tools/probe/stage-fire-punch-portable-on.py` replays the canonical ON anchor
through the first action menu at frame **1886**, then changes only the loaded
player battler's move slot:

| field | before | staged |
| --- | ---: | ---: |
| `gBattleMons[0].moves[0]` | `MOVE_ROCK_SLIDE` (157) | `MOVE_DOUBLE_TEAM` (104) |
| `gBattleMons[0].pp[0]` | 10 | 15 |

The normal FIGHT controller then runs unchanged. GROVYLE's canonical DOUBLE
TEAM resolves first; player-back ONIX's staged move dispatches at frame
**2305**, spends PP at **2331**, and produces no HP, status, damage, RNG, turn,
or facility mutation.

`Move_DOUBLE_TEAM` calls `AnimTask_DoubleTeam`, uses `setalpha 12,8`, and
places the attacker on `monbg`. `AnimTask_DoubleTeam` clones the live attacker
sheet twice, copies and darkens its OBJ palette by 11/16 toward black, then
drives both clones with the same source sine reducer from opposite phases.
The following `General_StatsChange` body is the shared evasion-increase BG1
banner already used by the canonical window. The portable implementation
therefore changes only the loaded attacker sheet/palette, explicit corner,
relative epochs, and live clone tie winner.

## Fresh ON evidence

The staged clone task is live at RAM frames **2337–2465**. Its two copies use
slots 3/4, and `sSpriteOrder` places slot 3 (clone A) before slot 4 throughout;
clone A therefore wins their OAM tie. Canonical turn 1 has clone B in front,
so this stage exercises a real ordering variant rather than a re-anchor of
identical pixels.

Presentation age zero is frame **2337**. Clone pixels occupy ages **2–129**;
the stat banner occupies ages **163–229**. The complete dense window is
frames **2337–2566**, **230/230 byte-exact**. The canonical Scene-ON fixture
`turn1-cloneanim.json` remains **230/230**.

## Reproduction

`npm run compare:double-team-portable` creates a fresh temporary directory,
runs the stock-controller stage through `tools/run-mgba-probe.py`, and
compares live app RGB for all 230 frames. Probe JSON and raw RGB are temporary
only; neither is bundled or consulted at runtime.
