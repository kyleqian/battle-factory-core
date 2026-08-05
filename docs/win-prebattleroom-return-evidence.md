# WIN non-terminal PreBattleRoom return, frames 5126-5512: dense evidence (Battle Scene OFF)

SIDE-LANE evidence packet, binding-ready for the WIN postwin/PreBattleRoom slice
(`docs/post-terminal-return-to-lobby-ground-truth.md` §1, §3, §4's slice 4).
Covers the window **immediately after** the exact `win-terminal-window-off`
compare trace's endpoint **frame 5125** (dismiss+115, the shared return
machinery's settle) through the fixture's own **final tick 5512**, in the
committed `mechanicLab` fixture
`tools/battle-lab/win-terminal-explosion-dusclops-off.json`.

**Headline, upfront:** the current app **already renders this entire window
exactly** — a scratch compare over every frame 5126-5512 is **387/387, 0 diff,
0 residual classes**. The generic postwin clock (age = frame − 5011) maps every
`POSTWIN_*_AGE` constant to a measured framebuffer boundary with no adjustment,
and the scene reuses `prebattleRoomRender.ts`'s room/box/text renderers and the
existing `prebattle-room-*` gen assets verbatim. There is **no source-extraction
gap** for this window. This packet pins the dense ground truth so that
exactness is reproducible and regression-detectable, and records the
handoff/age reconciliation for the supervisor to fold in.

## 1. Scope, method, inputs

- **Fixture:** `tools/battle-lab/win-terminal-explosion-dusclops-off.json`
  (5512 frames, WIN battleNum 0, dismiss edge = the fixture's last recorded
  `A` press, segment covering frames **5010-5011**). Input preserved exactly:
  the two scratch fixtures below are byte-copies except `trace.captureFrames`.
- **Canonical compare trace:** `tools/compare/traces/win-terminal-window-off.json`
  (segments sum to 5125, dense captures 4623-5125, **503/503**). **Not
  touched.** The canonical battle-lab fixture is likewise untouched.
- **Probes** (`bin/oracle lab`, Battle Scene OFF `http://127.0.0.1:8014`),
  each run twice for reproducibility:
  - `tools/battle-lab/scratch-win-prebattleroom-dense-a.json` — captures 5126-5381 (256)
  - `tools/battle-lab/scratch-win-prebattleroom-dense-b.json` — captures 5382-5512 (131)
  Together: every frame 5126-5512 at stride 1 (387 captures; split only because
  of the oracle's 256-capture limit).
- **Compare spec fixtures** for whoever implements/verifies the slice:
  - `tools/compare/traces-groundtruth/win-prebattleroom-return-off-a.json` (5126-5381)
  - `tools/compare/traces-groundtruth/win-prebattleroom-return-off-b.json` (5382-5512)
  Each reuses the canonical win-terminal app scaffold (`appStage` `win-terminal-window-off`
  at frame 4623, `appRoute` `generated-orchestrator`, `oracleProfile`
  `battle-scene-off`, `oracleBattleLab` → the canonical battle-lab fixture) with
  the fixture's own full 5512-frame segment schedule and dense captures in the
  covered span. These are ground-truth/spec fixtures: `npm run compare` is
  expected to be green today (see §4) and is the regression check for this
  window.

Method mirrors the ground-truth doc: 1-tick framebuffer sha256 boundaries first,
then targeted pixel/column analysis for content, then app-state instrumentation
for the clock reconciliation. No RAM probe needed (per-tick framebuffer hashes
plus the already-committed battle-lab semantic `state` are conclusive at this
resolution).

## 2. Dense 1-tick framebuffer boundary table

sha256 is over the raw RGB888 framebuffer (240×160×3), the oracle's own
convention. `bin/oracle lab` re-runs the two scratch fixtures above regenerate
this table; §6 shows the twice-run reproducibility.

| frames | ticks | sha256 (run A/B window) |
|---|---:|---|
| 5126-5140 | 15, one unique frame per tick | `a28f3350ab3b75d9…`, `09fd934a04d40120…`, `9ddc5e58ce284edf…`, `45247fc54143601c…`, `ef1ce3f1bfa2609f…`, `35a857e39c8b9567…`, `8293bc1be4de9c10…`, `ddc1e3eb276f39f7…`, `505fa3eda823e2fa…`, `4b2a9de494318aba…`, `839b637246eceed5…`, `7fd3e1f63b205f27…`, `8c8367301f35834d…`, `c051fd068e60870c…`, `f008715ba8befc22…` |
| 5141-5149 | 9, static | `14e9fb611e8c7127…` |
| 5150 | 1 | `4bf39eb6ea32fbf5…` |
| 5151 | 1 | `e724d159b1585b41…` |
| 5152 | 1 | `a7668fe4e0b84d86…` |
| 5153 | 1 | `a032c6a8e3d6a9e9…` |
| 5154 | 1 | `440b668e11e131f7…` |
| 5155-5156 | 2, static | `f7fa5c474d2f3e40…` |
| 5157 | 1 | `3f9c375891978134…` |
| 5158 | 1 | `71da9bb70fd7faf6…` |
| 5159-5160 | 2, static | `3f0b6a7c9b51a4fa…` |
| 5161 | 1 | `3384922481bd65ff…` |
| 5162 | 1 | `80095526626b7f35…` |
| 5163-5164 | 2, static | `1f17be19da0b22b4…` |
| 5165 | 1 | `0af7d3de01d9f419…` |
| 5166 | 1 | `961b806edb3d66af…` |
| 5167 | 1 | `0ee4ba7e067ab790…` |
| 5168 | 1 | `ad4caebeb4a1fae3…` |
| 5169 | 1 | `ae4ba2028fe4339c…` |
| 5170 | 1 | `6b2e08152a3371fd…` |
| 5171 | 1 | `e767a34b6822c67d…` |
| 5172 | 1 | `73b599f5261932c7…` |
| 5173 | 1 | `bc383651234c4f91…` |
| 5174 | 1 | `6b2b361c2041b758…` |
| 5175 | 1 | `3bae7abcbea0c433…` |
| 5176 | 1 | `1ac728f4cdfdb995…` |
| 5177-5178 | 2, static | `0919cb20d4e1474f…` |
| 5179 | 1 | `e64955a43a850fc4…` |
| 5180-5181 | 2, static | `15bf73a2b926a7ab…` |
| 5182 | 1 | `9ef8ea1915af7e92…` |
| 5183 | 1 | `559aa5716536f94f…` |
| 5184 | 1 | `15b59ea9d6ccb699…` |
| 5185 | 1 | `c7844718fa7ba807…` |
| 5186 | 1 | `0c98db56d24b0973…` |
| 5187 | 1 | `480f91fcbec8a94d…` |
| 5188-5189 | 2, static | `2e885411c979ce8d…` |
| 5190 | 1 | `17af9f2b190f286d…` |
| 5191 | 1 | `ec1487359bc54d9f…` |
| 5192 | 1 | `4f9e8d2cc9a24998…` |
| 5193-5194 | 2, static | `623a483fdf4b8e5e…` |
| 5195 | 1 | `f33e840ea3d84b1d…` |
| 5196 | 1 | `ff23edb5345013ac…` |
| 5197 | 1 | `4c6ac99066cf94e1…` |
| 5198 | 1 | `3f64270c6ccdeb87…` |
| 5199 | 1 | `624172de499735ed…` |
| 5200 | 1 | `0021391c8ce85c02…` |
| 5201 | 1 | `f6d5d64f4f5ea87d…` |
| 5202-5512 | 311, static | `5f60693cf16e867c…` |

(Full 64-hex hashes are in the two scratch fixtures' manifests, regenerable with
the `bin/oracle lab` commands in §7. Prefix table above is the binding
fingerprint.)

### Phase mapping (pixel- and hash-derived)

| frames | phase | evidence |
|---|---:|---|
| 5126-5140 | PreBattleRoom fade-in, 1 unique frame/tick | `FADE_IN` ramp; first dim step visible at 5126 (e.g. `bg(4,4)=(24,24,0)`), full brightness at 5140 (`(255,231,41)` wall tile). `mainCallback2` = `134766173` (settled overworld) throughout. |
| 5141-5149 | settled hold, player + attendant on screen, no box | 9 byte-identical ticks. 5140→5141's only 321-px change is the **OBJ layer's last fade step** (player sprite brightens fadeY 2→0, the one-tick-behind OBJ fade; region x113-126/y52-85). |
| 5150 | message box appears, **fully formed in one tick**, empty | 5149→5150 diff = 8092 px across x1-238/y115-156 (entire box), no glyph ink yet. |
| 5151-5202 | text typing, **1 glyph/tick, 52 glyph positions** | glyph-by-glyph diffs: "T" at 5151 (x16-21/y124-133), …, final "!" at 5202 (x164-165). The 2-tick static runs in the hash table are exactly the **7 space glyphs** ("Thank you for competing!" 3 + "Let us restore your POKéMON!" 4), which advance the printer without adding ink. |
| 5202-5512 | fully-typed hold, byte-identical, **no cursor** | 311 identical ticks; the fixture's own schedule never presses A again. |

Exact text (source `scripts.inc:456-458`, `BattleFrontier_BattleFactoryPreBattleRoom_Text_LetUsRestoreMons`):

    Thank you for competing!
    Let us restore your POKéMON!$

The `\n` between the two lines is not an extra printer tick — the 52 visible
glyph positions span exactly 52 ticks (5151-5202), consistent with the app's
`POSTWIN_HEAL_TEXT_TOTAL = 52`.

## 3. Age reconciliation: terminal-local ages ↔ generic terminal/postwin handoff

Direct app-state instrumentation (the win-terminal scaffold + `renderAppTrace`
tick loop, dumping `state.postwin.elapsed`):

- The terminal resolution owns the dismiss: `awaiting-message-dismiss` through
  frame 5010, `terminal-handoff` at frame 5011.
- `createPostwinStateFromRound` constructs `postwin` at frame **5012** with
  `elapsed = 1` (`GENERATED_ROUTE_INITIAL_ELAPSED`), so:

**`postwin age = frame − 5011`** — equivalently, age 0 = the second tick of the
2-frame dismiss A-press (frame 5011), i.e. `postwin age N` ↔ the ground-truth
doc's "dismiss+**(N+1)**".

Every `POSTWIN_*_AGE` boundary lands exactly on a measured framebuffer boundary:

| postwin age | constant | real frame | measured boundary |
|---:|---|---|---|
| 7 | `POSTWIN_BATTLE_FADE_FIRST_AGE` | 5018 | fade-to-black start (doc §1 5018-5047) |
| 37 | `POSTWIN_BATTLE_BLACK_AGE` | 5048 | first solid black (5048-5053) |
| 43 | `POSTWIN_IN_BATTLE_CLEAR_AGE` | 5054 | `gMain.inBattle` clear edge |
| 57 | `POSTWIN_BATTLE_ROOM_FIRST_AGE` | 5068 | battle-room flash fade-in (5068-5106) |
| 96 | `POSTWIN_SECOND_BLACK_AGE` | 5107 | second solid black (5107-5112) |
| 115 | `POSTWIN_COUNTER_ROOM_FIRST_AGE` | **5126** | PreBattleRoom fade-in start |
| 130 | `POSTWIN_COUNTER_ROOM_SETTLED_AGE` | **5141** | settled hold (player+attendant) |
| 139 | `POSTWIN_HEAL_BOX_AGE` | **5150** | box appears (empty) |
| 140 | `POSTWIN_HEAL_TEXT_FIRST_AGE` | **5151** | first glyph "T" |
| 191 | `POSTWIN_HEAL_TEXT_SETTLED_AGE` | **5202** | fully typed (last glyph "!" at 5202) |
| 194 | `POSTWIN_HEAL_INPUT_READY_AGE` | **5205** | earliest A accepted — not exercised (fixture ends held) |
| 501 | — | **5512** | fixture's final tick (dismiss+502) |

The shared dismiss+8..+115 machinery (ground-truth doc §3) maps to postwin ages
7..114 (frames 5018-5125); the PreBattleRoom content starts at dismiss+116 =
age 115 = frame 5126. The generic postwin clock therefore needs **no
adjustment** to reproduce this window — the generated-route `elapsed=1`
convention is exactly calibrated against this fixture's own real schedule.

## 4. Current app residual measurement (scratch compare, no production change)

`npm run compare` against the two spec fixtures (see §7), reusing the app's own
win-terminal scaffold at frame 4623:

- `win-prebattleroom-return-off-a.json`: **256/256** matched, 0 diff pixels.
- `win-prebattleroom-return-off-b.json`: **131/131** matched, 0 diff pixels.
- Total **387/387** frames 5126-5512, **0 residual classes** (no black-frame
  gap, no box/text timing residual, no sprite residual).

The app drives the whole window through `renderPostwinState`'s `counterRoom`
phase: `renderPrebattleRoomScene` (fade), `drawMessageBoxFrame` at
age ≥ 139, two-line text via `drawMessageBoxText` at (16,121)/(16,137) gated on
`postwinHealVisibleChars` — all already wired and pixel-exact. The `postwin`
module already models the heal message (`POSTWIN_HEAL_LINE1/LINE2`) and this
fixture's input-ready age.

This also closes the ground-truth doc §4's open question ("solid black past the
handoff"): the wiring at `core.ts:581-604` (`generatedCommandType ===
"battleWon"` → `createPostwinStateFromRound`) now fires for the win-terminal
scaffold, so `state.postwin` is populated from frame 5012 onward and the render
dispatch at `core.ts:2501` renders the return.

## 5. Asset / render-function reuse analysis; extraction gaps

**All reusable, no extraction gap for this window:**

- **Room scene** — `renderPrebattleRoomScene` (`prebattleRoomRender.ts:177`)
  with layout `cameraOriginPx` `{x:16,y:56}` and the layout's own
  `playerTile (8,8)` / `attendantTile (8,7)`. The return warp is to
  `MAP_BATTLE_FRONTIER_BATTLE_FACTORY_PRE_BATTLE_ROOM, 8, 8`
  (scripts.inc:100-107) — the layout's playerTile is exactly the warp target,
  so the S5 accept-path camera/scene composition transfers unchanged.
- **Message box** — `drawMessageBoxFrame` (`prebattleRoomRender.ts:282`) from
  `src/assets/gen/prebattle-room-msgbox.json`, drawn at the standard field-box
  origin (0,112). The box's visible extent (green Frontier chrome at y115-116
  and y155-156, light inner line y117/y154, white interior y118-153) is the
  asset's own tile art; palette index 13 is the `(0,255,156)` chrome, index 11
  the `(231,239,231)` line. App box pixels match the oracle byte-for-byte.
- **Text** — `drawMessageBoxText` (`prebattleRoomRender.ts:311`) with the
  box's own fg/shadow palette (msgbox indices 2/3); two lines at (16,121) and
  (16,137). Observed glyph rows y124-133 / y140-149.
- **Sprites** — the npcs asset's standard settled frames (attendant frame 0,
  player frame 1), already used by `renderPrebattleRoomScene`.
- **Gen assets** — `prebattle-room-layout.json`, `prebattle-room-tileset.json`,
  `prebattle-room-npcs.json`, `prebattle-room-msgbox.json`,
  `font-normal.json`, `charmap.json` — all already committed and used.

**Correction to the predecessor scout doc** (`post-terminal-return-to-lobby-ground-truth.md`
§1 row "5141-5149 … empty/opening message box"): the message box does **not**
open during 5141-5149. That span is a fully settled hold (player + attendant,
no box); the box appears **fully formed in one tick at 5150** and prints its
first glyph at 5151 — the same one-tick box-formation behavior the S5 accept
path already pinned (`prebattleRoom.ts` module doc point 5). No new mechanism
exists in this window.

## 6. Reproducibility

Each scratch fixture run twice (`bin/oracle lab`), raw framebuffer sha256
compared across runs:

- `scratch-win-prebattleroom-dense-a` runs 1 vs 2: **0/256 mismatches**.
- `scratch-win-prebattleroom-dense-b` runs 1 vs 2: **0/131 mismatches**.

Same runs produce the same PNGs; the two windows share boundary tick 5381/5382
consistently (5202-5512 held hash identical in both).

## 7. Files, commands, verification

New files (all file-disjoint; no production/`src/`, `tests/`, `tools/compare/`
*existing* files, `PROGRESS.md`, or `ISSUES.md` edited; the canonical
`win-terminal-window-off` compare trace and the canonical battle-lab fixture
are untouched):

- `docs/win-prebattleroom-return-evidence.md` — this packet.
- `tools/battle-lab/scratch-win-prebattleroom-dense-a.json` (256 captures, 5126-5381)
- `tools/battle-lab/scratch-win-prebattleroom-dense-b.json` (131 captures, 5382-5512)
- `tools/compare/traces-groundtruth/win-prebattleroom-return-off-a.json` (spec/compare fixture, 5126-5381)
- `tools/compare/traces-groundtruth/win-prebattleroom-return-off-b.json` (spec/compare fixture, 5382-5512)

Commands:

```sh
bin/oracle lab tools/battle-lab/scratch-win-prebattleroom-dense-a.json -o <out-a>
bin/oracle lab tools/battle-lab/scratch-win-prebattleroom-dense-b.json -o <out-b>
npm run compare -- win-prebattleroom-return-off-a --summary   # 256/256
npm run compare -- win-prebattleroom-return-off-b --summary   # 131/131
```

Verification run this session: `npm run compare -- win-terminal-window-off`
still **503/503** (adjacent window unchanged), the two spec fixtures above
387/387, `npm run test:smoke` green, full `npm test` and `npm run build` green
(see the committing entry). PAPERCUT: none new.
