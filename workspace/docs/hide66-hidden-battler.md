# hide66 (S10A integration, 2026-10-10): live bodies leave a hidden (semi-invulnerable) battler out — ISSUES #159 — and fly63 re-landed

Base `82690e775` (src `06b791ff`). Tested code `69eb65b71` (commits: rung 1 `79d5e82e1`, fly63 re-land `a9b53261b`, audit evidence
`30cebd7f4`, parity `785682fa8`, repair `69eb65b71`). Receipt: `tools/integration/fixtures/hide66-live-receipt.json`. Direct mGBA only;
no shared oracle was touched.

## 1. Results first

- **What the ROM hides.** A Fly / Bounce / Dive / Dig charger's battler OBJ gets `invisible = TRUE` in its charge animation
  (`battle_anim_flying.c:476` AnimFlyBallUp, `:975` AnimBounceBallShrink, `:1016` AnimDiveBall; `battle_anim_ground.c:327 / :366 / :374`
  Dig) and keeps it through every other battler's body until its own strike. Its **shadow** goes with it (`SpriteCB_EnemyShadow`,
  `battle_gfx_sfx_util.c:1214`: `battlerSprite->invisible` -> shadow invisible). A **Substitute doll** is the same OBJ, so it would be hidden
  too. Healthboxes are not hidden. In Scene ON `battlerData[b].invisible` is never set (the controller SPRITEINVISIBILITY command only runs
  under HITMARKER_NO_ANIMATIONS, `battle_script_commands.c:4341`), so `IsBattlerSpriteVisible` (`battle_anim.c:649`) stays TRUE: a `monbg`
  of the hidden battler would copy it into the BG and `clearmonbg` would clear its flag (`battle_anim.c:591 / :852`). No hidden-span body in
  the census does that (the hidden battler's own strike is excluded below; Sky Uppercut uses `monbg ANIM_DEF_PARTNER`, absent in singles).
  - **Corrected (land75, 2026-10-10):** the sentence above is wrong. In Scene ON `battlerData[b].invisible` IS set for a
    semi-invulnerable battler: every move-animation controller command ends with `CopyAllBattleSpritesInvisibilities()`
    (`battle_controller_opponent.c:1513`, `battle_controller_player.c:2534`, `DoMoveAnimation` state 3), which copies the charge
    animation's `gSprites[].invisible = TRUE` into `battlerData[].invisible`. So `IsBattlerSpriteVisible` (`battle_anim.c:662`) is FALSE
    for the hidden battler after its charge command, and a party-menu reshow re-creates its sprite INVISIBLE
    (`reshow_battle_screen.c:272`) — it does not un-hide it. Probed by hist73 (`docs/next-adapters-hist73.md` Part B;
    `tools/integration/fixtures/hist73/hidden-battler-audit.json` `rs-*` `flagsAfterReshow`: invisible bit set from the reshow until the
    strike, two species, A == B). The render hide (kept until the strike by `applyLiveSemiInvulnerableCommand`) therefore matches the
    ROM through a reshow; no render change was needed.
- **The fix (no module flag).** `renderBattleResolutionLiveView` derives `liveMoveHiddenSides(view.visibility, request)`, the hidden
  NON-attacker side (a hidden battler's own body is its strike, which reveals itself), and passes it through
  `liveMoveAnimationPresentation(..., hiddenSides)` and `renderSceneOnMovePresentation(fb, presentation, true, hiddenSides)`. Inside the
  renderer the hidden side's sheets are drawn transparent (palette index 0) whether a branch reads `liveSceneOnBattlerArt` or its own
  back / front species map (both are hide-aware locals); the opponent shadow is not armed for a hidden opponent.
- **Previously wrong live bodies (census seeds 0..999, master `82690e775`, `hide66Census.ts`):** 104 move bodies played while the other
  battler was hidden; **90 live commands / 12,744 live frames drew the hidden battler** (every live frame of them). After hide66: 0 / 0
  (also 0 / 0 with fly63 re-landed: 98 live hidden-span commands / 14,252 frames, none drawing it). "Drawing" is checked per frame: the
  production render vs the same render with the hidden species' sheet blanked at its source. Top movers: Wish 9, Bulk Up 6, Dig bodies of the
  other battler 6, Rest 5, Iron Defense 5, Double Team 3, Heal Bell 2, Sandstorm 3, Safeguard 7, Earthquake (at a hidden Dig user) 1.
- **Sky Uppercut branch: (b) fail closed** at a hidden target (`liveMoveHiddenTargetDeclines`). With the target hidden rows 0..149 are
  exact, but the ROM skips the age-148 / 149 lag frames and runs ahead; the measured hidden-target profiles are **[166] (187 rows, 8 / 10
  audit windows) and none (186 rows, 2 / 10)** vs the visible target's [148, 149] (`audit-17/receipts/sky-uppercut-lag-counters.txt`). A D4
  key would also need the hidden state in the body duration (`liveMoveAnimationDuration` has only the field) and would leave 2 / 10 windows
  in the other phase; deferred. Census cost: 1 command / 188 frames (battle 81) on both 0..299 and 0..999.
- **Census 0..299 (`liveShareCensus.ts`, key sequence (battle, kind, moveId, side, attacker, target) identical, battle digest identical,
  body lengths identical):** 7,729 -> **7,739** live commands (96.98 % -> **97.10 %**), live frames +1,203 (97.99 % -> **98.10 %**):
  fly63's +11 / +1,391 minus the one fail-closed Sky Uppercut (1 / 188). No live -> fallback change. **0..999:** 25,287 -> 25,387
  (91.89 % -> 92.26 %), live frames +15,799 (95.82 % -> 96.22 %); live -> fallback: 2 (battle 713 BARRIER player, MAGIC COAT opponent,
  "sprite allocator history unknown" after a Bounce) — a fly63 re-land effect: hide66 alone changes 0 statuses on 0..999.
- **Parity (Scene ON vs OFF, logical outcomes + RNG + rules + boundary at every turn):** Fly route census battle 81 (20 boundaries, digest
  `ceb69dfd…` == fly63's receipt) and Dig route battle 41 (28 boundaries): equal.

## 2. Audit-17 windows, production (no patch), after the fly63 re-land

`sh tools/integration/audit17Run.sh tools/integration/fixtures/hide66-audit17 <fresh scratch>`: stage == committed, derive ==
committed, two fresh direct-mGBA runs per window; **104 / 104 r1 == r2** (chain and entry). Receipts from `a9b53261b`; a fresh
rerun on the final `69eb65b71` gave 104 / 104 identical digests and px. The 67 windows that were 0 px stay 0 px;
**86 / 104 are 0 px now** (`hide66-windows.txt`).

| Windows | Rows | Chain px before -> after (r1 == r2) |
|---|---|---|
| Heal Bell, hidden-span (fly ply c0 c2, opp c0 c2 c4; bounce ply c0 c2, opp c0 c2) | 261 | 610,164 / 420,471 -> **0** |
| Heal Bell bounce-opp-c3 (paralysed user) | 261 | 468,495 -> 48,024 = the status-icon fixture ARTIFACT alone (= `receipts/patch-hidden`) |
| Double Team, hidden-span (fly / bounce ply c0 c2; opp c0 c2 c4) | 159 | 372,060 / 256,149 -> **0** |
| Sky Uppercut at a hidden target (fly ply c0 c2, opp c0 c2 c4 c6; bounce ply c0, opp c0 c2 c4) | 187 / 186 | live 832,606..989,702 -> **fallback** (3.42..3.48 M, branch (b)) |
| every other window (Thunderbolt, Ice Beam, Heal Bell / Double Team / Sky Uppercut after the strike, dt60 16) | | unchanged (74 identical digests) |

## 3. Gates (69eb65b71)

Targeted 31 files / 220 tests; the 13 files the first full run failed (field-only fixture views have no `visibility`; the split parser's
inline generic) rerun alone green after the repair; typecheck; smoke 8 / 448; full suite in two foreground shards (4 workers):
1,599 files / 13,163 tests passed, 0 failed; build; `compare:differential` 624 / 624 byte-identical vs `82690e775`; `git diff --check`.
`liveMoveTimingPolicy.ts` untouched (no d4a run).

## 4. Open points

- Hidden-span bodies other than Heal Bell / Double Team are source-correct for the sprite but not dense-ROM-proved under the hide; an
  invisible battler may shift a lag-frame phase (as for Sky Uppercut). Earthquake at a hidden Dig user (1 command on 0..999) is the only
  live body that animates the hidden target.
- Sky Uppercut at a hidden target: a D4 phase key ([166], 187 rows) needs the hidden state in the duration path.
- Battle 713's two allocator-unknown regressions belong to fly63's plans (outside 0..299).

## 5. Reproduction (from workspace/)

```
npx vitest run tests/hide66HiddenBattler.test.ts tests/spriteOrderFly63.test.ts
sh tools/integration/audit17Run.sh <fresh-receipt-dir> <fresh-scratch-dir>
python3 tools/integration/hide66Audit17Table.py <fresh-receipt-dir>
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=0..299 --out=a.json --commands=a.jsonl   # base: same in a 82690e775 worktree
python3 tools/integration/hide66CensusDelta.py base.json base.jsonl a.json a.jsonl
for k in 0 1 2 3; do node --experimental-strip-types --no-warnings tools/integration/hide66Census.ts --seeds=$((k*250))..$((k*250+249)) --index-from=$((k*250)) --commands=h$k.jsonl --out=h$k.json & done; wait
cat h0.jsonl h1.jsonl h2.jsonl h3.jsonl > h.jsonl; node tools/integration/hide66CensusSummary.mjs h.jsonl
node --experimental-strip-types --no-warnings tools/integration/hide66Parity.ts --seed=81 --streak=9
node --experimental-strip-types --no-warnings tools/integration/hide66Parity.ts --seed=41 --streak=10 --moves=91
```
