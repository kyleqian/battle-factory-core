# ISSUES #84(1): generated replacement send-out side routing

The reported MURKROW ball is an **opponent replacement** defect, not the
generated battle-start release. The public round-resolution command already
freezes `switch-in.battler: 0 | 1`, but `midBattleSwitchInAt` previously
discarded that owner and unconditionally projected the player controller's
lower-left `(24,68)` arc.

## OFF-profile receipt

`tools/battle-lab/issue84-opponent-replacement-sendout-off.json` is a legal
three-versus-three complete-party `mechanicLab` battle. URSARING KOs SUNKERN;
the stock Factory AI selects MACHOP (not MURKROW), and frames **470..630 are
captured without gaps**. Fresh output was written under a new `mktemp -d`
directory.

- frame 536, before the ball: `70a2e4060d505114da07499c225b4ace3e007048426c16ae22eaafdf06d731f4`
- frame 537, first visible closed opponent ball centered at `(176,64)`:
  `f784a99c2f45e6370c2d8ada2008069944492521967c8236f196f407da327359`
- frame 550, final closed-ball boundary:
  `0543267364537c979beaccd5e21a0725ad46d8524090436ac62b318b5fb0c803`
- frame 551, release/open-materialize boundary at the same opponent origin:
  `8f51f93d47cdbb30d112df17520624556ddb64e99f553474a2657bcfa5365de5`

The player-side sibling remains the dense legal complete-party receipt
`tools/battle-lab/scratch-mid-battle-switch-dense-a-off.json`: its rendered
ball spans frames 1143..1184 and follows the lower-left `(24,68)` arc already
pinned in `docs/mid-battle-switch-presentation-ground-truth.md` §§3,6.

## Source ownership

`reference/pokeemerald/src/battle_controller_opponent.c:1160-1198`
(`OpponentHandleSwitchInAnim`/`StartSendOutAnim`) invokes
`DoPokeballSendOutAnimation(..., POKEBALL_OPPONENT_SENDOUT)`. In
`reference/pokeemerald/src/pokeball.c:367-399`, `GetBattlerSide` selects the
party and the throw case selects either:

- player: `(24,68)` plus `SpriteCB_PlayerMonSendOut_1`;
- opponent: `GetBattlerSpriteCoord(X)`, `GetBattlerSpriteCoord(Y)+24` plus
  `SpriteCB_OpponentMonSendOut` (singles center `(176,64)`).

The repair therefore carries typed `side`, `ballOrigin`, and `ballPose` from
the existing battler-owned switch-in command into the renderer. Species,
trainer, battle/turn number, absolute tick, rules state, and RNG do not
participate.
