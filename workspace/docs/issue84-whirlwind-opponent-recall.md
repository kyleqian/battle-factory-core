# ISSUES #84: forced opponent recall and release

`tools/battle-lab/issue84-whirlwind-opponent-recall-off.json` is the smallest
complete-party receipt used for this repair. A legal Level-50 BUTTERFREE uses
WHIRLWIND against a living MURKROW lead; Emerald's own trainer-battle
replacement selection chooses the living GROVYLE bench member. The trace uses
Battle Scene OFF and captures every frame 210..420.

Two fresh runs in distinct `mktemp -d` outputs were byte-identical across all
211 PNGs and raw-framebuffer hashes. The useful controller boundaries are:

- 220..256: outgoing MURKROW and its healthbox remain visible while the
  `BUTTERFREE used / WHIRLWIND!` message owns the box; frame 256 raw RGB hash
  `7c2d98fec73708a44c1ab8e8d1d80fd7fb86b4e291b2c6b1a6d4d9bfceb2f826`.
- 257: the return-to-ball controller has removed MURKROW and its healthbox;
  raw RGB hash
  `8bd16e5d2544ab650c9705c29126d802d0b1ed281e452f007f74c98afb41b60b`.
- 280 is the last closed-ball pose
  (`7fd9e606fefb985c5b4f6d4f04e99ed4f9f0b88d42857fd44c99b1282d921600`).
- 281..283 open the ball. Frame 284 visibly contains the open ball and the
  pink affine-emerging GROVYLE at the same time
  (`8a77c42457ccd815c309b62ddeb553d79166e0c0d3a4a7ddaab8088cc1608d5a`).
- 320 is the last nonsettled release frame
  (`5101f04f504c3ad07088c65db4cc72251bacf919721a091e065dcbd9792a8d3c`);
  321 is settled. The source then prints `Foe MURKROW was / dragged out!`.

Source ownership is `BattleScript_SuccessForceOut` followed by
`Cmd_returntoball` (`battle_script_commands.c:5346-5352`), which emits
`CONTROLLER_RETURNMONTOBALL` with animation enabled. The opponent controller
destroys the sprite and hides its healthbox. The later generic
`getswitchedmondata` / `switchindataupdate` / `switchinanim` chain owns the
incoming party member and release. `SpriteCB_ReleaseMonFromBall` selects the
opponent callback, front-sprite elevation, affine emerge, and ball-open tint;
none of these facts depend on move, species, trainer, battle number, or tick.
