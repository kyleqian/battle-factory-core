# Animation coverage

## MOVE_MIRROR_COAT promoted exact; sparkle-3-special-screen track complete (2026-07-29)

**Verdict:** `MOVE_MIRROR_COAT` is exact. Source, generated inventory, and
controller audit prove set **151 `FRONTIER_MON_CORSOLA`** is its lowest legal
Level-50 carrier and one animation body is reachable: a valid opposing special
hit reaches `Move_MIRROR_COAT`; the failure route selects no animation body.
Complete legal Corsola/Exeggcute Scene-ON parties stage real Confusion damage
before Mirror Coat's -5-priority counter in both orientations.

**Evidence:** the complete first-active wall frame through first-inactive
cleanup passes twice fresh per orientation. Player-back **349–423 (75/75)**
records special damage/result **26→52**, evidence/raw
`1ea5591d85dc0e4926b8e763584f405ed4ec72d43c676ad06fc551cedb44aa92` /
`c8a70485e2d13ae522c31760ee7e6ecb24bb464eb567427855448389ab1128a7`;
opponent-front **355–429 (75/75)** records **31→62**,
`3328d443c81b35a5305590705e7448d009aa0111a326b318c08b420a29939a7d` /
`0fcba1ad43f479f613f84243bca184e10f4545e7e6566558327c081444b73b5b`.

**Model / sibling:** the reducer and seam reuse only source-identical
`AnimDefensiveWall` and six `SpecialScreenSparkle` lifecycles while preserving
Mirror Coat's red wall/tag, wall-before-audio delay-10/immediate attacker pan,
no Light Screen sound task, palettes/registers, BG/OBJ ordering, legal carrier
art/geometry, and cleanup. `MOVE_LIGHT_SCREEN` independently reruns exact twice
fresh at **115/115 player-back + 119/119 opponent-front**, with unchanged
evidence/raw hashes.

**Ownership / next:** no counter/damage semantics, accuracy, RNG, controller,
turn/facility state, boundary list, unsupported barrier, or canonical allowlist
changed. Coverage is **103 exact / 0 partial / 0 staged / 173 unsupported**.
Next incomplete ranked track: `red-heart-sweet-kiss`
(`MOVE_ATTRACT` independently unsupported).

## MOVE_COTTON_SPORE promoted exact; spore-particles track complete (2026-07-29)

**Verdict:** `MOVE_COTTON_SPORE` is exact. Source and legal inventory prove
set **49 `FRONTIER_MON_MAREEP`** is its lowest Level-50 carrier (Relaxed,
HP+SpAttack, Cheri Berry). Complete Scene-ON Mareep/Onix parties pass the
full source body through first inactive cleanup twice fresh per orientation:
player-back **286–489 (204/204)** evidence/raw
`f3505c583dbfd81459fa5a6ae013a0e84d8583f0cf3e0d0ec8cb1817c120e0c3` /
`b46bd803dd59cf953c0fa0d4a979d15ab6c9060a6cc7b14571dbcb69cea38007`;
opponent-front **285–488 (204/204)**
`a719bb8dff37cdf3f82a3909b6129e694b1982fa0800152dbbd7c3ae105e5983` /
`629fb753f6e9522a6144b90c630b4d6306e3fcdd1b2558fe9af8a55617ab569c`.

**Model/evidence:** the pure reducer, typed seam, and production compositor
reuse `ANIM_TAG_SPORE`/`AnimSporeParticle` while preserving Cotton Spore's
splitbgprio, opaque particle cell/OAM, 18/10 target-panned loop audio, lack of
alpha/blendoff/SporeDoubleBattle, target-relative geometry, hardware latch,
monbg, and cleanup. `MOVE_SPORE` independently reruns **207/207** twice fresh
in both orientations and remains exact.

**Ownership / next:** no accuracy or Speed result, damage, RNG, controller,
turn/facility state, boundary list, unsupported barrier, or canonical
allowlist changed. Coverage is **102 exact / 0 partial / 0 staged / 174
unsupported**. Next incomplete ranked component track:
`sparkle-3-special-screen` (`MOVE_MIRROR_COAT` independently unsupported).

## MOVE_BRICK_BREAK promoted exact; both controller-selected bodies accepted (2026-07-29)

**Verdict:** `MOVE_BRICK_BREAK` is exact. Source/controller audit proves
`removelightscreenreflect` selects distinct normal and shattered-wall
presentation bodies. Complete legal Lombre/Onix Scene-ON parties prove both
twice fresh per orientation. `BrickBreakNormal` passes **151/151** semantic
and production frames: player-back **234–384** evidence/raw
`ad3d3e90b70fde1595dda316a773e887f17123df5ad5815086159ddb52398b5d` /
`67687eb221c4efb306fdca646b78fd181469aa22ef98e48d7006b4a9ec2c27cb`;
opponent-front **220–370**
`b1ac1081da160add8d9e92f878e3051199a909987735dc5bf06cd921bb1f8fab` /
`4a03768b6549b364296e3639833e7c5d0cd6dedcec567ee62f20e32fd94c2645`.

**Wall body / model:** `BrickBreakShatteredWall` passes **192/192** twice per
orientation: player-back **288–479** evidence/raw
`e484e602be861db10e4042c2a6de75e5f6e261e533515d48d8597637db5c4697` /
`e1b36f8036f30386af0c7cdaac9645f73bb9eb526802c3179e745871cf637363`;
opponent-front **289–480**
`f0314f159cb9b141c107cbe078382ebb4ff7379c4ce2c835aa9b921c65bbe27a` /
`8402d60c9605e852c0f099dbc617c80dc21d005097ed1985395b647564ae23bc`.
The reducer/seam/compositor preserve two lunges, three hitsplats, fist,
24+10+3 WindUpLunge, target-panned audio, BG blend, monbg/alpha, wall, four
40-step TORN_METAL shards, hardware transfer/order, and cleanup.

**Boundary:** `MOVE_CRUSH_CLAW` stays independently unsupported; no gameplay,
screen outcome, RNG, controller, facility state, boundary list, unsupported
barrier, or canonical allowlist changed. Coverage is **101 exact / 0 partial /
0 staged / 175 unsupported**.
