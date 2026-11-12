# Can production track gRng2Value (Random2) exactly in real Factory play?

S10A side-lane evidence and design, 2026-10-05. Source paths are relative to `reference/pokeemerald`.
All probes are direct mGBA runs (not the shared HTTP oracles). Each relied-on probe ran twice from
fresh processes and produced identical results (RAM sha1 and per-frame-runs sha1, §6).

**D3 answered, 2026-10-06:** the user approved the surrogate presentation RNG
for the next run, with deterministic per-battle seeds stored in session exports
and a separate "faithful random" live claim. Source findings below are unchanged.
ROADMAP S10A and ANIMATION_VERIFICATION.md now define the implementation gates.

## 0. Verdict

**NOT TRACKABLE across real play. Exact within a body once its activation value is known.**

- The per-frame advance is **not animation code**. It is the wireless link layer:
  `AgbMain` (`src/main.c:131-165`) → `UpdateLinkAndCallCallbacks` (`main.c:171-174`) →
  `HandleLinkConnection` (`src/link.c:1798`) → `RfuMain1` → `rfu_LMAN_manager_entity(Random2())`
  (`src/link_rfu_2.c:2023`). That chain draws one `Random2()` per **main-loop iteration** while
  `gWirelessCommType != 0`. The value is 1 in this ROM environment, both at the anchor and after
  lab staging. It is set by `IsWirelessAdapterConnected` → `SetWirelessCommType1`
  (`link.c:237-239`, called from `main_menu.c:639`).
- So gRng2 at any frame = LCG^(main-loop iterations + explicit draws)(anchor value). The number of
  main-loop iterations is the number of frames minus the **lag frames**: frames whose main-loop work
  overran the frame budget, so `WaitForVBlank` (`main.c:164`) skipped that frame.
- Inside animation bodies, the lag frames sit at fixed offsets: all 16 body kinds on the route
  were stable, and StatsChange is +3/+4/+65/+66 on both the route and the lab. **Between bodies the
  lag is not a function of anything production knows.** With the same active mon (Onix: Rock Slide,
  Bind, Dragon Breath, Sandstorm) and the same inputs, entering action selection costs 3 or 4 lag
  frames and opening the move menu costs 2 or 3 (§3.3). A single wrong lag frame shifts every later
  word, so the strict chain dies at the first such gap.
- Strict chain from the anchor (§4): **route: 2 of 29 move-body activation edges known and exact,
  0 mismatches.** The chain invalidates at frame 2477, the turn-2 selection gap. That count uses a
  lag table learned from the route itself, so it is an upper bound. A table learned from the labs
  covers none of the route's units (0 of 29). Between the two short lab battles, though, the
  out-of-sample chain is **6 of 6 known and exact in each direction**. The model is right whenever
  each gap's lag takes its usual value. On the canonical battle it does not, from turn 2 on, and a
  tracker cannot tell when that happens.
- Once an activation value is known, words follow exactly from (non-lag frames to the draw frame
  + earlier draws + source draw order) (§5). The accepted Double Kick `fistRandom` words come out
  bit-exact, and every lab draw frame (Double Kick ×2 hits, Astonish, Mud-Slap ×6 waves) is exact.

Consequence: these 52 Random2 animations cannot render bit-exact in general play. Exact rendering
needs either a CPU-cycle model of every main-loop iteration (out of scope) or an oracle-pinned
activation value (staged scenarios only, as today). **D3 option (a) was approved on 2026-10-06:**
use a surrogate presentation RNG with the ROM's law and draw order, reproducible replay seeds,
and a separate faithful-random claim for ordinary play (design §7).

## 1. Attribution (route: `battle1-postwin-dense`, Scene ON, 29,601 frames from the canonical anchor)

Instrument: `tools/integration/random2RouteProbe.py`.
- **Pass 1** reads `gRng2Value` (`0x03005d84`, `random.c:9`) after every frame and converts each
  frame's delta into a count of ISO_RANDOMIZE1 steps.
- **Pass 2** runs a fresh session and single-steps every animation-active frame, every frame with
  more than one step, and 2 samples per (context, steps) class. Each step checks whether the
  pipelined PC equals `Random2+2` and records the LR. It also watches for writes to `gRng2Value`
  from outside `Random2`.

| quantity | value |
|---|---|
| anchor `gRng2Value` (factory.json Scene ON; the Scene OFF anchor is the same) | `0x808DB3EB` (2156770283) |
| `gWirelessCommType` at anchor | 1 |
| frames / total LCG steps | 29,601 / 29,379 |
| lag frames (0 steps) | 282 |
| explicit animation draws | 60, all `AnimDirtScatter+0x2e/+0x38` (`battle_anim_ground.c:213-214`), Sand Attack: 30 sprites × 2 |
| single-stepped frames | 4,128. Every one has exactly one `RfuMain1+0x10` call; the 6 Sand Attack draw frames add 10 dirt draws each |
| writes to `gRng2Value` outside `Random2` | 0 |
| frames whose step count could not be resolved | 0 |

Per-frame law, measured: **steps(f) = [f is not a lag frame] + explicit draws(f)**. `RfuMain1`
always draws first in a frame, because the link layer runs before the callbacks (`main.c:171-174`).
Draws then come in source order. For example, Double Kick's draw frame is `RfuMain1`, then
`AnimFistOrFootRandomPos` +0x96/+0xaa/+0xc0/+0xd4 (`battle_anim_fight.c:487-492`).

**Outside animations it advances everywhere.** Steps equal frames minus lag on the draft screen
(`CB2_SelectScreen`, 298 frames, 5 lag), in the overworld (550 frames, 27 lag; 27 consecutive lag
frames at 843-869, which is the pre-battle save), on map loads, in `CB2_InitBattle` and the
transition, in every `BattleIntro*` state (trainer slide, party summary, send-out), in text
printers, on HP bars (`CompleteOnHealthbarDone`), in action and move menus, on faint and switch,
in the party menu (`CB2_InitPartyMenu`: 19 of 20 frames are lag), and while returning to the
overworld between battles. Full table: `fixtures/random2/route-battle1-postwin-dense.json`
→ `stepsByBattleMainFuncAndAnimActive`. **Idle** frames (waiting in a menu) advance 1 per frame.

**Scene OFF** (`fixtures/random2/sceneoff-battle1-intro-inputs.json`): the anchor value and the
`RfuMain1` law are the same, and the first 1,886 frames give 1,825 steps, identical to Scene ON.
With Scene OFF, `gRng2Value` keeps advancing once per non-lag frame; only the animation draws are
absent. Scene OFF therefore does not freeze `gRng2Value`, and nothing on the Scene OFF screen reads it.

Other `Random2` callers in the source (`grep Random2 src`) are all animation code, plus
`daycare.c:466,476`, `record_mixing.c:780-913,1108` and `battle_pyramid.c:991` (with reseeds at
`daycare.c:460`, `record_mixing.c:781`, `battle_pyramid.c:988`). None of them is on a Factory path.
`gRngValue` (gameplay) is a separate word at `0x03005d80` and is never touched by any of this.

## 2. Consumption model

For any frame interval I:

`steps(I) = |I| − lag(I) + Σ draws(bodies in I)`

| unit | consumption | known to production? |
|---|---|---|
| any frame | 1 (`RfuMain1`) unless lag | frame count: yes (frame-exact engine) |
| move/general/status body | length − lag(body) + draws(body) | length: yes. draws: yes (source plan; `DRAWS` in `random2StrictChain.py`). lag(body): stable per (script, length) on route and lab, so it could be tabulated |
| Double Kick | 4 draws at +10 from activation | yes |
| Astonish | 4 draws (2 droplets × `0x1ff`/`0x7f`) at +31 | yes |
| Mud-Slap / Sand Attack | 6 waves × 10 draws (+9, +13, … +29 for Mud-Slap) | yes |
| action-selection entry | 3 or 4 lag frames | **no**: varies with identical visible content |
| move-menu open | 2 or 3 lag frames | **no** |
| faint / send-out, party menu, overworld save, map load, battle init | lag clusters of 1-27 frames | not measured for stability; same class of cost |

Gameplay RNG (`gRngValue`) never appears in the model.

## 3. Evidence for the gap lag

### 3.1 Strict-chain units

`random2StrictChain.py --merge-gaps` uses two kinds of unit, both of which production already
knows:
- an animation body, keyed by (activation script label, body length);
- the non-animation stretch between two bodies, keyed by its sequence of
  (`callback2`, `gBattleMainFunc`, player controller) states.

Finer keys (single controller states) are worse. A lag frame can fall one frame either side of a
ROM state change, so 7 of the per-state kinds come out unstable.

### 3.2 Stable vs unstable kinds (route)

- All 16 animation-body kinds are stable: Rock Slide 2, Double Team 2, StatsChange 4,
  Faint Attack 7, Fly turn 1 0 / turn 2 2, …
- The lab bodies are stable too: Double Kick 2, Tackle 2, Astonish 0, Mud-Slap 0, StatsChange 4.
- The only unstable kind is the full turn gap (end of body → selection → next body). It costs
  6, 7, 6 and 5 lag frames on its four occurrences.

### 3.3 Content independence

`random2LagContent.py` (fixture `route-selection-lag-content.json`) lists all 34 selection lag
clusters with `gBattleMons[0]` species and moves. For the first 30 clusters the active mon and
moves are identical (Onix, moves 157/20/225/201). Even so:
- entry clusters take 3 or 4 frames (1744: 3, 2576: 4, 5582: 3, 7218: 3, 8115: 4, …);
- move-menu clusters take 2 or 3 frames (3849: 3; the rest 2).

The lag positions inside an entry, counted from the selection start, also shift between
[1,4,5,6], [3,4,5], [1,4,5] and [3,4], even when the three preceding battle states are identical
(e.g. 2576 vs 5582; 9137 vs 9991). The extra frame is therefore not explained by mon or
move-name rendering, and it is not a discrete event either. It is a cycle-budget
effect: the main loop's work lands just over or just under one frame. Likely contributors are
VBlank-time sound mixing (`m4aSoundMain` cost depends on the music's active voices) and DMA/text
work. This is an inference; the cycle split was not measured. Either way, production has no model
of it.

## 4. Strict-chain counts (seed once, never re-seed, invalidate at the first unmodelled or unstable unit)

| test | lag table from | move-body edges known / exact / mismatch | all edges | invalidated at |
|---|---|---|---|---|
| route, seed = anchor | route (in-sample, upper bound) | **2 / 2 / 0** of 29 | 3 / 3 / 0 of 38 | frame 2477, turn-2 selection gap (unstable) |
| route, seed = anchor | lab | 0 / 0 / 0 of 29 | 0 of 38 | frame 1, draft screen (unmodelled) |
| lab, seed = lab frame 0 (`0x3A5C2A2A`) | lab (in-sample; most kinds seen once) | 6 / 6 / 0 of 6 | 7 / 7 / 0 of 7 | — |
| lab, seed = lab frame 0 | route | 0 / 0 / 0 of 6 | 0 of 7 | frame 1, partial selection (unmodelled) |
| lab B (Astonish → Double Kick → Mud-Slap, seed 44) | lab A (out-of-sample) | **6 / 6 / 0** of 6 | 7 / 7 / 0 of 8 | frame 2428, a final hit/HP-bar gap A never had (unmodelled) |
| lab A | lab B (out-of-sample) | **6 / 6 / 0** of 6 | 7 / 7 / 0 of 7 | frame 2412, after the last edge (unmodelled) |

- The known route edges are Double Team at 1963, StatsChange at 2125 and Rock Slide at 2340.
- Lab edges: Double Kick at 87 and 215 (two hits), Tackle at 533 and 2371, Astonish at 1023,
  Mud-Slap at 1968, StatsChange at 2162.
- Lab B edges: Astonish at 89, Double Kick at 1045 and 1173, Tackle at 1492 and 2387, Mud-Slap at
  1984, StatsChange at 2178, Status_Confusion at 2584. Lab B shows the same body lag offsets as
  lab A: Double Kick +33/+34, Tackle +28/+29, StatsChange +3/+4/+65/+66.
- Zero mismatches wherever the chain claims to know the value. Coverage, though, ends at the first
  inter-body gap whose lag varies. On the route that is the second turn.

## 5. Words from a known activation value (`random2BodyWords.py` → `fixtures/random2/body-words-check.json`)

- **Accepted Double Kick fixture** (`tools/compare/fixtures/double-kick-player-nidorina-opponent-onix.json`):
  - Start from the receipt's activation row (frame 227, `0x8C5713A0`).
  - Advance 9 `RfuMain1` steps (frames 228-236), then the draw frame's own `RfuMain1` step.
  - The next 4 steps give x, y, xSign, ySign = **46625, 58366, 21952, 56639 = the pinned
    `fistRandom`, exact.**
- **Lab:** Double Kick hits 1 and 2 (draws at +10), Astonish (+31) and all 6 Mud-Slap waves (+9…+29)
  have no lag before their draws. In each case the predicted value after the draw frame equals the
  observed value, and `RfuMain1` comes first in each draw frame. `allExact: true`.
- **Body plan for a Random2 adapter:** given the activation value v,
  `words = Random2 outputs after (non-lag frames from activation through the draw frame + earlier draws of the body)`.
  Each output is `>> 16` of the stepped state (`random.c:31-32`). The draw order is the source order
  from `visual-randomness-prep.md` §2.

## 6. Reproducibility (two fresh runs each, identical)

| probe | runs sha1 | final RAM sha1 (EWRAM+IWRAM) |
|---|---|---|
| route, exhaustive stepping | `c212fb52…` | `7a815eb6…` |
| route, controller context | `31bb1bca…` | `b8bfb405…` |
| lab, exhaustive stepping | `ebe7e0d7…` | `513fe7e6…` |
| lab, controller context | `79d3a2db…` | `4eb53147…` |
| lab B, controller context | `6795cfa5…` | `3ebed26f…` |
| Scene OFF intro | `dc9ed63a…` | `ec4d2685…` |
| route selection lag content | whole JSON identical | — |

The per-frame step sequence is identical across all probe variants. Only the final RAM sha1
differs between instrument variants, while each variant reproduces its own sha1 exactly (open
question 3). The raw savestate blob is not byte-stable across identical runs, which is why the
probe hashes RAM.

## 7. Design (D3 option (a) approved by the user, 2026-10-06)

A pure module, `src/engine/presentationRng.ts`. Production code is not written here.
- **State:** `{ value: u32, provenance: 'pinned' | 'surrogate' }`.
- **Operations:** `advanceFrames(n)` (one ISO_RANDOMIZE1 step per frame, plus an optional jump-ahead
  using the affine-square method in `random2StrictChain.py:lcg_n`) and `draw()`, which returns
  `value >> 16`. It imports nothing from the gameplay RNG or battle state.
- **Seeding:**
  - Staged scenarios that pin `animationRngAtAge0` use `pinned` and are exact, as today.
  - Everything else seeds once per battle from a non-gameplay source (for example the anchor
    constant `0x808DB3EB` advanced by frames since the anchor) and is labelled `surrogate`. Never
    seed from `gRngValue`.
- **Per frame:** the host advances one step per presented frame. It does **not** try to model lag;
  that is the documented reason it is not exact.
- **Per body:** a Random2 adapter asks the host for its words at its draw frames in source order.
  The words are pure functions of (state at activation, body plan) and never touch the engine's
  battle RNG.
- **Orchestrator:** the host lives next to `liveSpriteOrderHost.ts`, with one instance per battle
  that the presentation seam owns. Its state is presentation-only and is never serialised into
  battle or RNG state.
- **Replay/export:** store the presentation seed and policy version in separate session metadata.
  Reset/replay must reproduce the stream; legacy exports use a documented deterministic default.
  Repainting a frame must not draw again. See ANIMATION_INTEGRATION_SUPERVISOR.md for the approved contract.
- **Tests:**
  1. The LCG and jump-ahead match the receipt sequence.
  2. The Double Kick words from the receipt activation are exact (the §5 vector).
  3. The lab Mud-Slap wave vectors.
  4. ON/OFF parity: the engine's `rngValue` is unchanged across a route with presentation RNG enabled.
  5. The surrogate provenance flag survives into the adapter config.
- **First moves to wire, smallest draw counts first** (`visual-randomness-prep.md` §5): Flail (2),
  Double Kick (4), Astonish (4), Thrash (12), Luster Purge (12). Mud-Slap and Sand Attack (60) come
  last. Dizzy Punch and Teeter Dance need no RNG.

Oracle-exact Random2 rendering remains limited to pinned scenarios. A tracker that also models
lag would need cycle-accurate costs for text, DMA and sound mixing; that work is outside the
approved surrogate implementation.

## 8. Open questions

1. What decides the extra selection lag frame? The sound-mixer cost hypothesis was not measured.
   If a production-known predicate exists after all, the in-battle chain would become trackable,
   since the lab cross-geometry result (6/6 both ways) shows the rest of the model generalises.
   A per-iteration cycle count (single-step the whole selection-entry frame and sum the cycles)
   would settle it.
2. On real hardware without a wireless adapter, `gWirelessCommType` would be 0 and `gRng2Value`
   would only move on animation draws. The emulator ROM reports 1. Production follows the oracle,
   but the per-frame law is an artifact of the adapter-detection environment.
3. Why does the final RAM sha1 depend on which addresses the probe reads, when the gRng2 sequence
   does not? Plausibly bus or open-bus side effects of the libmgba read path. It was not
   investigated.
4. Lag stability for faint/send-out, the swap screen and between-battle units was not tested
   across geometries.

## 9. Reproduce

```sh
PY=../../vendor/mgba-venv/bin/python
python3 tools/run-mgba-probe.py /tmp/route.json -- $PY tools/integration/random2RouteProbe.py \
  tools/compare/traces-groundtruth/battle1-postwin-dense.json /tmp/route.json --step-sample 2 --step-anim   # ~5 min
python3 tools/run-mgba-probe.py /tmp/route-c.json -- $PY tools/integration/random2RouteProbe.py \
  tools/compare/traces-groundtruth/battle1-postwin-dense.json /tmp/route-c.json --step-sample 0 --controller-ctx
python3 tools/run-mgba-probe.py /tmp/lab.json -- $PY tools/integration/random2RouteProbe.py \
  tools/battle-lab/random2-doublekick-astonish-mudslap.json /tmp/lab.json --lab --step-sample 2 --step-anim
python3 tools/run-mgba-probe.py /tmp/off.json -- $PY tools/integration/random2RouteProbe.py \
  tools/compare/traces-groundtruth/battle1-intro.json /tmp/off.json --bootstrap factory-battle-scene-off.json --step-sample 1
python3 tools/run-mgba-probe.py /tmp/lc.json -- $PY tools/integration/random2LagContent.py \
  tools/compare/traces-groundtruth/battle1-postwin-dense.json /tmp/lc.json
F=tools/integration/fixtures/random2
python3 tools/integration/random2StrictChain.py $F/route-battle1-postwin-dense-ctrl.json --merge-gaps
python3 tools/integration/random2StrictChain.py $F/route-battle1-postwin-dense-ctrl.json --merge-gaps --train $F/lab-doublekick-astonish-mudslap-ctrl.json
python3 tools/integration/random2StrictChain.py $F/lab-doublekick-astonish-mudslap-ctrl.json --merge-gaps
python3 tools/integration/random2StrictChain.py $F/lab-astonish-doublekick-mudslap-ctrl.json --merge-gaps --train $F/lab-doublekick-astonish-mudslap-ctrl.json
python3 tools/integration/random2BodyWords.py
```

Fixtures (`tools/integration/fixtures/random2/`, about 0.5 MB, no mGBA logs):
- `route-battle1-postwin-dense{,-ctrl}.json`, `lab-doublekick-astonish-mudslap{,-ctrl}.json`,
  `lab-astonish-doublekick-mudslap-ctrl.json` (lab B, scenario `tools/battle-lab/random2-astonish-doublekick-mudslap.json`),
  `sceneoff-battle1-intro-inputs.json`, `route-selection-lag-content.json`;
- `chain-*.json` (strict-chain outputs with per-edge lists and lag tables);
- `body-words-check.json`.
