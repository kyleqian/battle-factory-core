# ISSUES #56 item 2 — display-latch event design

## Verdict

**Park frame 444 as a settled one-frame record.** The source does have
per-widget facts (`gSprites[bar].inUse` and each icon's `inUse`), but it does
not produce separate bar/icon *tick* transitions. On the terminal task call it
destroys the bar and first icon, then destroys the remaining icons in a tight
loop (`reference/pokeemerald/src/battle_interface.c:1740-1768`). The only way
the emulator-visible boundary can contain MAGNETON's observed intermediate
state—bar unavailable while later icons remain alive—is for VBlank/frame
observation to interpose inside that one foreground callback. That is a
CPU/VBlank phase fact, not a source-owned tick-granular lifecycle fact.

The two synced cases close the remaining escape hatch. YOSHI and
`interactive-generated-intro-off` both destroy bar and icons at
`rawElapsed=31`; their terminal summary task state and pending
`gMain.oamBuffer` rows are equivalent, yet their pixels require opposite bar
display-tail clocks
([banked Round 4 evidence](issue56-frames-444-536-oam-probe.md#round-4-2026-07-31-main-lane-interactive-handoffrawelapsed-pinned-existing-source-lifecycle-cannot-safely-discriminate)).
Thus raw elapsed, task readiness, sprite destroy order at video-tick
granularity, and the pending OAM shadow are all falsified producers. Hardware
OAM can tell an instrument what was actually published, but the current native
engine cannot predict *which side of VBlank* foreground execution reaches
without a sub-tick receipt or a cycle-aware scheduler. This is the same class
as #61's parked controller/VBlank ordering, not a missing route/species branch
([#61 verdict](issue61-vblank-phase-event-design.md#verdict)).

This verdict covers only the status-summary bar/icon display tail at frame
444. The independent materialize-column-shift defect at the same frame remains
out of scope
([banked Round 2 evidence](issue56-frames-444-536-oam-probe.md#part-a--the-described-fix-rampixel-verified-for-its-own-targeted-4-pixels-but-not-landed)).

## 1. Source model: task state is not display state

### 1.1 The task installs motion, then later destroys every widget

`Task_HidePartyStatusSummary` changes all ball icons and the summary bar to
OBJ blend mode, gives every icon its exit callback, gives the bar its own exit
callback and exit subsprite table, and then installs the battle-start fade task
(`reference/pokeemerald/src/battle_interface.c:1671-1719`). The bar callback
increments its `x2` displacement each sprite-animation pass
(`battle_interface.c:1823-1830`); each ball callback independently advances
its delayed accelerating exit (`battle_interface.c:1878-1895`). Those are
separate motion producers even though the TypeScript renderer currently feeds
both from one scalar `elapsed` (`src/engine/battleScene.ts:6561-6575,6683-6717`).

The terminal task, however, does not schedule two video-frame events. When
`tBlend` becomes `-1`, it calls destruction for the summary bar and icon 0,
then destroys icons 1–5 in the immediately following loop
(`reference/pokeemerald/src/battle_interface.c:1740-1768`). `DestroySprite`
resets the selected `struct Sprite` (`reference/pokeemerald/src/sprite.c:
618-630,682-685`), whose `inUse` flag is an ordinary field in the struct
(`reference/pokeemerald/include/sprite.h:194-242`). The task itself remains
alive until `tBlend==-3` (`battle_interface.c:1770-1775`). Therefore:

- “task reached terminal destroy callback” is earlier than “task destroyed”;
- per-widget `inUse` can change sequentially within that callback; and
- there is no source variable saying “destroy the bar this video tick, destroy
  the icons next video tick.”

### 1.2 Pending OAM is built before the task destroys sprites

The established battle foreground callback runs `AnimateSprites`, then
`BuildOamBuffer`, and only later `RunTasks`
(`reference/pokeemerald/src/battle_main.c:1863-1869`). `AnimateSprites`
invokes every live sprite callback before animating it
(`reference/pokeemerald/src/sprite.c:308-321`), so this pass advances the bar
and icon exit positions. `BuildOamBuffer` then updates coordinates, sorts the
sprites, and writes them to `gMain.oamBuffer`
(`sprite.c:325-337`). Only live, visible sprites are admitted; the unused tail
is replaced with dummy OAM (`sprite.c:482-499`). Bar subsprites are expanded
into individual pending OAM rows (`sprite.c:1679-1751`).

Consequently, when `RunTasks` later executes the terminal destroy calls,
destroying a `gSprites[]` entry does **not** retroactively remove the rows
already built in `gMain.oamBuffer`. A later `BuildOamBuffer` is required to
omit the destroyed widgets. This source order explains the Round 4 snapshot:
terminal `data[15]=-1` and outgoing bar rows can coexist without contradiction
([banked Round 4, “Source task/OAM discriminator check”](issue56-frames-444-536-oam-probe.md#source-taskoam-discriminator-check)).

### 1.3 VBlank publishes the shadow; scanout consumes hardware OAM and OBJ VRAM

`LoadOam` is the publication edge: it copies all of `gMain.oamBuffer` to the
hardware OAM address (`reference/pokeemerald/src/sprite.c:640-644`; the OAM
address and size are defined at `reference/pokeemerald/include/gba/defines.h:
61-62`). Battle VBlank calls `LoadOam`, then processes pending sprite-image
copies, then transfers palettes (`reference/pokeemerald/src/battle_main.c:
2084-2105`). Sprite image-copy requests target OBJ VRAM
(`reference/pokeemerald/src/sprite.c:785-820`). Thus the visible widget is a
join of two published inputs: hardware OAM says which OBJ rows/attributes are
selected, while OBJ VRAM supplies the selected tiles.

VBlank is asynchronous with respect to the foreground callback. The main loop
runs callbacks and then waits, while `VBlankIntr` is separately installed in
the interrupt table and invokes the active VBlank callback
(`reference/pokeemerald/src/main.c:28-46,131-168,340-358,410-416`). Therefore
the display pipeline is:

1. sprite callbacks advance bar/icon positions;
2. `BuildOamBuffer` snapshots live widgets into pending OAM;
3. the terminal task may reset the widget `gSprites[]` entries;
4. a later build omits them from pending OAM;
5. whichever pending buffer `LoadOam` observes at VBlank becomes hardware
   OAM; then sprite-copy requests can change the addressed OBJ VRAM; and
6. the emulator's next framebuffer scanout exposes the combination.

Steps 3–5 need not align to the trace API's one-video-frame boundary. The
banked YOSHI probe demonstrates the consequence rather than assuming it: the
bar and icons are last live at app frame 443 and their sprite slots are reset
at 444, yet the oracle wants the previous displayed bar step to persist for
that frame
([Frame 444 RAM/pixel reconciliation](issue56-frames-444-536-oam-probe.md#rampixel-reconciliation)).
Task destruction therefore does not determine the last visible pixel by
itself; the rebuilt pending buffer, VBlank `LoadOam`, OBJ-VRAM publication,
and scanout boundary complete the causal chain.

### 1.4 Why YOSHI is synced but MAGNETON is split

The source destroys the summary bar before the later icon calls
(`reference/pokeemerald/src/battle_interface.c:1753-1768`). Round 3 observes:

- YOSHI: bar and icons are absent at the same sampled frame;
- MAGNETON: the bar is already unavailable at app 436, while icons remain
  live until app 437; and
- the interactive anchor: bar and icons are absent together at absolute 1492
  ([banked Round 3 tables](issue56-frames-444-536-oam-probe.md#round-3-2026-07-31-main-lane-magneton-side--third-fixture-ram-probe--discriminator-not-pinned-clean-no-fix-landed)).

There is no source branch in the cited terminal block between species,
trainer, route, or battle number. The source-backed explanation for the
MAGNETON intermediate sample is that the emulator-visible boundary lands
after the bar reset but before all later icon resets. YOSHI and the
interactive fixture land outside that short instruction interval. This is a
falsifiable inference: an instruction-ordered watch in §4 must see the
MAGNETON VBlank/frame boundary inside the destroy sequence and the two synced
fixtures outside it. If it does not, the park verdict is false.

## 2. Falsification-first discriminator audit

| Candidate tick-level discriminator | Result | Evidence |
| --- | --- | --- |
| `rawElapsed` / semantic handoff | Falsified | YOSHI and interactive both destroy synced at 31 but want opposite bar tails; MAGNETON is bar 30/icons 31 ([Round 4 table](issue56-frames-444-536-oam-probe.md#source-taskoam-discriminator-check)). |
| Current summary task state | Falsified | YOSHI and interactive share terminal task id/data, including `data[11]=31`, `data[15]=-1` ([Round 4 task snapshot](issue56-frames-444-536-oam-probe.md#source-taskoam-discriminator-check)). |
| Pending `gMain.oamBuffer` | Falsified | The two synced cases have the same outgoing bar rows yet require opposite tails ([same Round 4 snapshot](issue56-frames-444-536-oam-probe.md#source-taskoam-discriminator-check)); source builds those rows before tasks (`battle_main.c:1863-1869`). |
| Per-widget `gSprites[].inUse` at a sampled frame | Descriptive, not predictive | It records the sequential destroy calls (`battle_interface.c:1753-1768`) and distinguishes MAGNETON after the phase crossing, but a tick engine cannot know where the asynchronous boundary cuts the callback (`main.c:340-358`). |
| Hardware OAM at framebuffer capture | Descriptive, not predictive | It is the buffer actually published by `LoadOam` (`sprite.c:640-644`), so it should identify what scanout can use; producing its value still requires the within-tick order of rebuild and VBlank. |
| Route, trainer, species, absolute tick/parity | Rejected fit | `isCanonicalAnchorIntro` restores the anchor but breaks MAGNETON; removing the override fixes YOSHI's target pixels but regresses both held fixtures ([banked Round 2](issue56-frames-444-536-oam-probe.md#part-a--the-described-fix-rampixel-verified-for-its-own-targeted-4-pixels-but-not-landed)). |

**Conclusion:** no banked or source-derived state that is available at the
native engine's tick boundary discriminates the required display tails. A
hardware-OAM watch may confirm the *result* of the phase order, but it is not a
producer for arbitrary native routes. This matches #61: ordinary state exists
on either side of the interrupt, while the missing input is which operation
ran first inside the video tick
([#61 §1.4](issue61-vblank-phase-event-design.md#14-the-determining-state-is-below-tick-granularity)).

## 3. Candidate typed designs

All three candidates split the current shared consumer. Today
`opponentSummaryExitElapsed` chooses one `elapsed`, and
`drawOpponentSummaryExit` uses it for both the bar and all icons
(`src/engine/battleScene.ts:6659-6717`). MAGNETON proves that downstream
shape is insufficient even though no safe upstream producer is yet present.

### Candidate A — per-widget logical lifecycle plus fixed VBlank latency

**State.** Add an `OpponentSummaryExitLifecycle` with separate `bar` and
`icons` members, each carrying `motionElapsed`, `sourceAlive`,
`pendingOamPresent`, `publishedOamPresent`, and `lastPublishedMotionElapsed`.
Events would be `advanceWidgetMotion`, `destroyWidget`, `buildOam`, and
`vblankPublish`.

**Producer and consumers.** A pure producer would port the task/sprite order:
sprite motion, buffer build, then terminal destroys
(`reference/pokeemerald/src/battle_main.c:1863-1869`; `battle_interface.c:
1740-1768`). `drawOpponentSummaryExit` would consume separate published bar
and icon views; `opponentSummaryExitElapsed` would become at most a legacy
adapter, not the lifecycle owner (`src/engine/battleScene.ts:6659-6717`).

**Tier-1 pins.** Test that (1) motion changes before a build, (2) destroy does
not mutate already-pending OAM, (3) a subsequent build omits the destroyed
widget, (4) VBlank publishes the pending version, and (5) bar/icon render
clocks can differ without a species/route input. These directly pin the source
ordering above.

**Evaluation.** This is the correct downstream type, but a fixed
“one VBlank after destroy” rule still makes identical YOSHI and interactive
terminal states publish identically. It also cannot create MAGNETON's sampled
mid-callback split because the source destroy calls share one foreground task
invocation. Implementing it now would either leave frame 444 unchanged or hide
the rejected selector in `destroyWidget` timing. **Do not implement.**

### Candidate B — ordered hardware-OAM/display receipt

**State.** Retain Candidate A, but make a generic ordered receipt the producer:
`spriteMotion`, `buildOam`, `destroy(bar)`, `destroy(iconN)`,
`vblankLoadOam`, `objVramCopy`, and `scanout`. The reducer publishes typed
`barDisplayReady` and `iconDisplayReady[]` edges only from that order.

**Producer and consumers.** An emulator or future scheduler supplies the
receipt. The presentation state consumes only the resulting published widget
views; `drawOpponentSummaryExit` renders those views and no longer knows
route/species/tick identity. This mirrors the real separation between
foreground build/task work and VBlank `LoadOam`
(`reference/pokeemerald/src/battle_main.c:1863-1869,2084-2105`).

**Tier-1 pins.** Replay at least three synthetic orders: VBlank before the
terminal task; VBlank after all destroys but before the next rebuild; and an
interrupt boundary between bar and later icon destroys. Assert that identical
logical inputs can yield the two synced tails and the MAGNETON split solely
from receipt order. Reject missing, duplicate, or causally inverted events.

**Evaluation.** This is an honest seam and would consume a real hardware watch
correctly. The browser engine currently receives buttons once per tick, calls
one atomic engine tick, and immediately renders; its deterministic ABI repeats
that same operation once per requested frame (`src/main.ts:30-38,67-83`;
`src/engine/core.ts:434-444`). It has no CPU/VBlank instruction receipt.
Synthesizing the three committed recordings' receipts would be a baked oracle
trace. Candidate B is valid infrastructure only when a general producer
exists. **Do not implement alone.**

### Candidate C — cycle-aware foreground/VBlank scheduler

**State and producer.** Model CPU progress and scanout phase within a GBA video
frame, including the sprite callbacks, OAM build, task dispatch, VBlank IRQ,
`LoadOam`, sprite-copy processing, and scanout publication. Candidate B's
receipt then becomes scheduler output rather than fixture data. The required
participants are explicit in source (`reference/pokeemerald/src/main.c:
131-168,340-358`; `battle_main.c:1863-1869,2084-2105`).

**Consumers and Tier-1 pins.** Downstream consumers remain Candidate B's typed
bar/icon views. Tests must pin interrupt ordering before/inside/after the
terminal destroy block, OAM shadow versus hardware OAM, and stability when
unrelated foreground work changes phase. The three banked fixtures become
acceptance receipts, not selector inputs.

**Evaluation.** This is the only candidate that can generate the missing fact
for arbitrary routes. It requires validated cycle costs for all foreground and
IRQ work that can precede this callback; a partial “summary widget cycle” is
another proxy because unrelated work moves the VBlank crossing. This is
CPU-emulation-scale blast radius, the same conclusion reached for #61
([#61 Candidate C](issue61-vblank-phase-event-design.md#candidate-c--cycle-aware-foregroundirq-scheduler)).

### Acceptance blast radius for any future implementation

Any implementation changes the shared generated-initial-release tail and must
preserve these committed Scene-OFF windows before frame 444 may be claimed:

| Window | Required result | Why in blast radius |
| --- | ---: | --- |
| `factory-arbitrary-intro-yoshi-off` | **700/751** | Target frame 444 lives here; frame 536 is a separately fixed held pin ([Round 2 regression summary](issue56-frames-444-536-oam-probe.md#updated-summary-for-the-supervisor)). |
| `interactive-generated-intro-off` | **715/715** | Original `rawElapsed=31` special-case fit; plain removal regresses frame 1492 ([Round 2 Part A](issue56-frames-444-536-oam-probe.md#part-a--the-described-fix-rampixel-verified-for-its-own-targeted-4-pixels-but-not-landed)). |
| `factory-arbitrary-intro-magneton-off` | **703/751** | Its analogous frame 437 wants the opposite shared scalar and its bar/icons split ([Round 2 and Round 3](issue56-frames-444-536-oam-probe.md#round-3-2026-07-31-main-lane-magneton-side--third-fixture-ram-probe--discriminator-not-pinned-clean-no-fix-landed)). |
| `battle-command-generated-off` | **128/128** | Exact generated-route canary already held by the frame-536 fix ([Round 2 regression set](issue56-frames-444-536-oam-probe.md#part-b--real-onset-pinned-exactly-matches-the-existing-sibling-mechanism-landed-clean)). |

Tier-1 coverage must additionally prove separate bar/icon published clocks,
OAM-shadow immutability across destroy, publication only on VBlank, and the
absence of trainer/species/route/absolute-tick fields in the producer. The
current scalar tests explicitly pin the behavior that would be replaced
(`tests/factoryBattleStartIntro.test.ts:114-135`), so migration must change
those only alongside the new causal event tests.

## 4. Recommendation and bounded slice plan

### 4.1 Recommendation: park now

Record frame 444's status-summary portion as settled under the #5/#61 policy
class. Candidate A names the desirable per-widget consumer shape, Candidate B
names the missing event interface, and Candidate C is the only general
producer. None is a bounded frame-444 fix today. Do not remove or narrow the
`generated-initial-release && rawElapsed===31` branch, and do not add a
trainer/species/route/tick selector: the former loses exact windows and the
latter would encode the recordings rather than the mechanism
([banked Round 2 verdict](issue56-frames-444-536-oam-probe.md#part-a--the-described-fix-rampixel-verified-for-its-own-targeted-4-pixels-but-not-landed)).

Reopen only if §5 identifies a stable, tick-granular state present *before*
publication that predicts all three orders across timing sweeps, or if the
project adopts a general cycle-aware scheduler. Merely reading a different
hardware OAM value after VBlank confirms what was displayed; it does not
falsify this producer verdict.

### 4.2 Bounded implementation slices if the gate is falsified

1. **Pure per-widget reducer, no pixel wiring.** Land Candidate A's state and
   synthetic build/destroy/publish tests. No committed compare result may
   change.
2. **Behavior-preserving adapter.** Project the existing scalar through the
   typed bar/icon view without changing event order. Require all four counts
   in §3 to hold.
3. **Real producer only.** Wire the state found by §5, with no route/species/
   trainer/tick inputs. Require YOSHI to improve without losing the other
   three counts; capture every frame in the affected tail, not a thinned set.
4. **Breadth.** Delay-sweep all three intro fixtures and add at least one new
   generated opponent. The same producer must explain every destroy order.

If slice 3 cannot name a producer before code is written, stop after the park
record; a reducer without a causal input is not progress on the residual.

## 5. Falsifiable pre-implementation probes

No fresh probe was run for this design step: the banked Round 2–4 RAM/OAM
evidence plus the source callback order already decides the current question.
These are the precise reopening probes.

### 5.1 Instruction-ordered destroy/VBlank watch (decisive)

Extend `tools/probe/dump-issue56-frames-444-536-oam.py` with instruction
callbacks/breakpoints at:

- `Task_HidePartyStatusSummary_BattleStart_2` entry and exit;
- each destruction call site at `battle_interface.c:1756-1768`;
- `BuildOamBuffer` entry/exit (`sprite.c:325-337`);
- `VBlankIntr` entry/exit (`main.c:340-371`);
- `VBlankCB_Battle`'s `LoadOam` call (`battle_main.c:2084-2105`); and
- framebuffer/capture completion.

At every event record emulator cycle count, `REG_VCOUNT`, PC, the summary
task's `data[11]/data[15]`, all seven widget `inUse` flags and OAM fields,
the matching `gMain.oamBuffer` rows, raw hardware OAM at `0x07000000`, the
referenced OBJ-VRAM tile bytes, and the framebuffer hash. Resolve current
addresses from the pinned ELF/map rather than copying addresses into
production. Run the validated OFF-profile fixture matrix:

```sh
python3 tools/run-mgba-probe.py /tmp/issue56-yoshi-phase.json -- \
  tools/probe/dump-issue56-display-phase.py /tmp/issue56-yoshi-phase.json \
  tools/battle-lab/factory-arbitrary-intro-yoshi-off.json 1608:1620

python3 tools/run-mgba-probe.py /tmp/issue56-magneton-phase.json -- \
  tools/probe/dump-issue56-display-phase.py /tmp/issue56-magneton-phase.json \
  tools/battle-lab/factory-arbitrary-intro-magneton-off.json 1608:1620

python3 tools/run-mgba-probe.py /tmp/issue56-interactive-phase.json -- \
  tools/probe/dump-issue56-display-phase.py /tmp/issue56-interactive-phase.json \
  tools/compare/traces/interactive-generated-intro-off.json 1485:1498
```

`dump-issue56-display-phase.py` is a proposed probe, not an existing tool; it
must preserve the existing fixture-composition code and must be run through
`tools/run-mgba-probe.py` so output validation and the known teardown crash
remain honest.

**Prediction:** MAGNETON's frame boundary/VBlank lands between the bar reset
and at least one later icon reset; YOSHI and interactive land outside that
interval. Pending versus hardware OAM changes only when the ordered
build/`LoadOam` sequence permits it. Differences reduce to cycle/VCOUNT/PC
phase, not a stable tick-level gameplay field.

**Refutation:** before the first divergent destroy/publication event, the watch
finds a stable logical field—other than route, species, trainer, absolute tick,
or replay identity—that predicts all three event orders. It must keep doing so
under §5.2's delay sweep. That field becomes Candidate A's producer. A
different hardware OAM value observed only *after* the phase crossing confirms
the model rather than refuting it.

### 5.2 Delay sweep and per-frame hardware-OAM watch

For each fixture, create scratch copies with 0–31 extra idle frames before the
acknowledgement press, then rerun §5.1. As a cheaper first pass, extend the
existing frame-boundary probe to include hardware OAM and OBJ VRAM, and run:

```sh
python3 tools/run-mgba-probe.py /tmp/issue56-yoshi-oam.json -- \
  tools/probe/dump-issue56-frames-444-536-oam.py /tmp/issue56-yoshi-oam.json \
  tools/battle-lab/factory-arbitrary-intro-yoshi-off.json 1608:1620

python3 tools/run-mgba-probe.py /tmp/issue56-magneton-oam.json -- \
  tools/probe/dump-issue56-frames-444-536-oam.py /tmp/issue56-magneton-oam.json \
  tools/battle-lab/factory-arbitrary-intro-magneton-off.json 1608:1620

python3 tools/run-mgba-probe.py /tmp/issue56-interactive-oam.json -- \
  tools/probe/dump-issue56-frames-444-536-oam.py /tmp/issue56-interactive-oam.json \
  tools/compare/traces/interactive-generated-intro-off.json 1485:1498
```

The existing script does **not** yet read hardware OAM/OBJ VRAM, so that cheap
pass requires a generic extension before it can test the latch. Its current
`gSprites[]` output alone merely reproduces Round 3.

**Prediction:** inserting idle frames may move the instruction/VBlank crossing
without changing the terminal task payload or pending widget rows. No one-tick
latency constant will predict every member. **Refutation:** a source-owned
frame-level field predicts the published bar/icon views across every sweep
member and at least one new generated fixture; only then is a bounded native
producer justified.
