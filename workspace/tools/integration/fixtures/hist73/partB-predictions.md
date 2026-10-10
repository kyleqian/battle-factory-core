# hist73 PART B predictions (recorded 2026-10-10 12:29 PDT, BEFORE any Part B probe ran)

Source read: battle_controller_opponent.c OpponentHandleFaintAnimation / battle_controller_player.c PlayerHandleFaintAnimation
(SpriteCB_FaintOpponentMon / SpriteCB_FaintSlideAnim + HideHealthboxAfterMonFaint / FreeMonSpriteAfterFaintAnim: no branch on
`invisible`), reshow_battle_screen.c CreateBattlerSprite (:224-272: the same CreateSprite for every live battler, then
`invisible = battlerData[battler].invisible`, which Scene ON never sets: hide66 doc §1).

P1 (faint of a hidden Fly charger, end-of-turn Toxic damage, the census battle 533 path): the ROM runs the SAME faint as for a
visible battler. The invisible battler sprite slides / sinks and is destroyed; no other OBJ slot is created or freed differently;
the occupied set and sSpriteOrder after faint -> next-mon summary -> send-out equal those of a VISIBLE faint at the same
position (control = the same staging with the faint on the visible strike turn), up to the send-out's own sprites. The
`invisible` bit of the battler is set (1) from the setup body until the faint; the new mon's sprite is visible (0).
=> order plan: the visible `faint` event; afterwards the side is no longer hidden (clear hidden[b]).

P2 (forced send-out reshow while the OPPONENT is a hidden Fly charger, census battle 713 path): the reshow allocates exactly as a
normal reshow with both battlers present (same CreateBattlerSprite order); the hidden opponent's battler sprite is re-created
VISIBLE (invisible bit 0) although STATUS3_ON_AIR stays set, until its strike body.
=> order plan: the normal `battle-reshow`; hidden flags drop to false. Render consequence (not the order host): production's
hide (applyLiveSemiInvulnerableCommand keeps the side hidden until the strike) would then DISAGREE with the ROM between the reshow
and the strike.

P3 (player-side hidden faint): same as P1 on the player side (SpriteCB_FaintSlideAnim on an invisible sprite).
