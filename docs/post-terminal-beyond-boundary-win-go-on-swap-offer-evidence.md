# WIN style commentary → swap offer (Battle Scene OFF)

This evidence packet continues
`post-terminal-beyond-boundary-win-go-on-style-commentary-evidence.md` by one
input only. `scratch-win-go-on-swap-offer-probe.json` preserves that fixture's
31 segments byte-for-byte, then appends one two-frame A press and 900 idle
frames. No cursor movement or YES/NO decision is authored.

## Oracle boundary

The press lands at frames 9040-9041, safely inside the style page's held
`0876b5f15bc6…` framebuffer. That page remains visible through 9043. The ROM
then follows `CommentOnOpponentStyle` into
`Text_LikeToSwapMon` (`BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:
145,604-606`):

- frame 9044: reused message box cleared;
- frames 9045-9104: the 60-character text `Before starting the battle, would
  you / like to swap a POKéMON?` types at the established one-character clock;
- frame 9107: the YES/NO standard window and initial YES cursor are copied;
- frame 9111: the source-relative `MSGBOX_YESNO` input-ready boundary
  (`POSTWIN_SWAP_INPUT_READY_DELAY = 70`), visually identical to 9107 and held
  unchanged through the fixture endpoint 9942.

The committed capture list is dense at 9036-9130 with 20 sparse tail anchors.
Two fresh app/oracle runs matched **115/115** frames each, including every
clear, typing, menu-copy, and held sample.

## App binding

`win-go-on-swap-offer-off.json` reuses the generic
`win-terminal-window-off` appStage at frame 4623 and copies the fixture's 33
segments and 115 captures verbatim. Existing postwin state is sufficient:
`acceptPostwinDialoguePage` advances page 3→4, the shared dialogue printer
renders `POSTWIN_SCOUTING_LINES[3]`, and the source-relative
`POSTWIN_SWAP_MENU_VISIBLE_DELAY` / `POSTWIN_SWAP_INPUT_READY_DELAY` clocks
create the YES/NO hold. There is no production mismatch and no calibration.

```sh
npm run compare -- win-go-on-swap-offer-off --summary  # 115/115
npm run compare -- win-go-on-style-commentary-off --summary  # 92/92
```

The next bounded unit is a real swap decision (cursor movement plus NO, or a
separate YES entry into the swap UI). This packet deliberately stops before
either branch. Only the scratch fixture, ground-truth spec, and this evidence
note belong to the side-lane commit.
