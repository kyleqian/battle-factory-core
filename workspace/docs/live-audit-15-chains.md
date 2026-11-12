# Live audit 15 (S10A side lane, 2026-10-09): CHAIN routes that went live tonight — consumers after a planned / net-zero / retained unit

This audit renders a consumer's complete dense window (activation through cleanup) after a UNIT whose history tonight's folds made lend a
known order or allocator host. It compares each window row by row with fresh ROM frames. The folds are:
- `a556f6cdf`: allocator net-zero bodies;
- `6a7af5b47`: prep45 order plans (BRN, TURN_TRAP, Hydro Pump, Solar Beam by turn, ...);
- `213918b23`: Icy Wind at any geometry;
- `024efddfd`: the retained locked-action prompt cycle (Petal Dance / Dig / Solar Beam continuations).

Master is 5364b05c4 (production src tree da34a188). Every run was direct mGBA only, and no shared oracle was touched. The only src edits
were two env-gated patches: each was applied in place, reverted, and kept as a `.diff`. `git status src` was clean at every commit. Evidence
is in `tools/integration/fixtures/audit-15/`.

**Method (production path).** Each battle-lab scenario (`overrides.parties`, 2-3 prompt cycles) plays a UNIT, then a CONSUMER on the
other side, in the same or a later prompt cycle. The pipeline:
1. A direct-mGBA probe (`prep48Probe.py`) records every animation body: its label, attacker, and gBattleMons at activation.
2. `audit15Fixtures.py` turns the battle's history up to the consumer into kernel semantic payloads, one turn per action prompt:
   - the MOVE_ANIMATION;
   - a HIT_ANIMATION when the target's HP drops;
   - `status-animation` (BRN / PRZ / confusion);
   - TURN_TRAP [83];
   - STATS_CHANGE.
3. The harness's `precedingTurns` mode replays that history through the PRODUCTION hosts (`postkoHostReplay.ts`):
   - `liveSpriteOrderHost`, with the prompt cycle per turn;
   - the orchestrator's allocator seam;
   - `liveBattlerX2EventsOf` for the x2 history.
4. That gives lend -> live adapter -> `renderBattleResolutionLiveView`.

`audit15Check.ts` first records whether the host lends KNOWN and whether the adapter is live at age 0. A declined row is a fallback, not a
live claim. It then compares every row with **two more fresh probe processes** (`verifyLiveAdapterFramebuffer`; the harness throws unless
r1 == r2).

Every chain is paired with its consumer's **no-unit control**: the same species, with the unit replaced by Counter, which fails against a
non-physical consumer, so the consumer is the battle's first body. A second pass, the **entry-lend sensitivity control**
(`AUDIT15_ENTRY_LEND=1`), renders the same ROM window with the history cut to the consumer body alone. A 0-px chain row whose entry-lend
control is non-zero **discriminates** the chain's lend.

**Totals.**
- 65 scenarios and **142 consumer windows**: 139 live, 3 declined.
  - This counts the 3 Thunderbolt-after-Giga-Drain windows as live. `receipts/main` shows them declined: the replay helper has no
    geometry callback. `audit15GdCheck.ts` replays the same history WITH the orchestrator's callback and finds them live and 0 px.
- Every window's two fresh runs give identical per-row digests.
- The full reproduction (`audit15Run.sh`: stage == committed, derive == committed) was run twice from scratch. The second pass is
  byte-identical to the committed receipts (see §4).

Results:
- **130 of 139 live windows are 0 px on every row.** That covers all of these consumers after these units:
  - consumers: Flamethrower, Thunderbolt, Blaze Kick, Heal Bell, Reflect, Protect, and Light Screen (player side);
  - units: BRN, Hydro Pump, TURN_TRAP Fire Spin, Icy Wind, Ice Beam, Swift, Double Team, Faint Attack, Giga Drain, and the Petal Dance /
    Dig / Solar Beam retained continuations.
- **33 of them discriminate the lend.** These are Blaze Kick and Heal Bell after BRN, Hydro Pump (both sides), TURN_TRAP, Icy Wind, Ice
  Beam, Petal Dance, Dig and Solar Beam. The first-body lend leaves 4..66 px there, and the production chain lend leaves 0. So the lent
  order itself is pixel-exact through these chains.
- **No SPECIES- or HISTORY-DEFECT was found.**
- The other 9 live windows are **one TIMING-PHASE class**: the opponent-side Light Screen's row-59 BLDALPHA step. It is a VBlank-write
  phase with counter evidence. A history-keyed fix was tried and **refuted** on the accepted species pair.

## 1. Results first

### Defect table

| Unit -> consumer | Side / species | px before -> after patch | Mechanism | file:line | Fix shape | Status |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | **none**. The one candidate (below) failed its patch proof on the accepted pair, so it is classified TIMING-PHASE, not DEFECT |

### TIMING-PHASE (counter evidence: `receipts/vblank/table.txt`, `lag-counters.txt`, 2 fresh runs each, identical)

<table>
<thead>
<tr><th>Consumer</th><th>Rows</th><th>Counter evidence</th><th>Residual / patch results</th></tr>
</thead>
<tbody>
<tr><td valign="top"><strong>Light Screen 113, OPPONENT attacker</strong> (production <code>src/animation/lightScreen.ts:79</code>: <code>kind === "light-screen" &amp;&amp; side === "opponent" &amp;&amp; age === 52 ? 9</code>, a hard-coded one-row BLDALPHA hold; row 59 = reducer age 52, wall anchor +7)</td>
<td valign="top">9 windows, <strong>2,658 px on row 59 only</strong> (bbox 115..156 x 8..71; the ROM is one blend step ahead, <code>b1d690</code> vs production <code>a8d182</code>):
<ul>
<li>SNORLAX/CHANSEY after Double Team, Faint Attack, Hydro Pump, Ice Beam and Swift;</li>
<li>EXEGGCUTE/ONIX (the accepted pair) as the <strong>first body</strong> and after Double Team, Faint Attack and Swift.</li>
</ul>
The 0-px windows hold:
<ul>
<li>the SNORLAX/CHANSEY first-body control;</li>
<li>the accepted <code>light-screen-live-opponent.json</code> (EXEGGCUTE/ONIX after Tackle).</li>
</ul></td>
<td valign="top">The <code>audit15VblankProbe.py</code> IO vs buffered BLDALPHA at each frame, plus <code>sGpuRegWaitingList</code>:
<ul>
<li>In the <strong>hold</strong> windows (SNORLAX/CHANSEY first body; EXEGGCUTE/ONIX after Tackle), row 59 has IO eva/evb <strong>9/7</strong>, buffer <strong>8/8</strong>, and waiting list <strong>[0x52]</strong>. The write was buffered by <code>SetGpuReg</code> (VCOUNT outside VBlank) and lands one frame later.</li>
<li>In the <strong>direct</strong> windows (5 measured: SNORLAX/CHANSEY after DT / FA / Swift; EXEGGCUTE/ONIX first body and after DT), IO == buffer == <strong>8/8</strong> and the list is empty.</li>
<li>The player side is direct in all 3 windows measured.</li>
<li><code>issue151Counters.sh</code> lag ages are <strong>[68, 69] in all 9</strong> LS windows of both phases. So this is not a lag frame: it is a VBlank-write (CPU-load) phase that depends on the species pair <strong>and</strong> the history.</li>
</ul></td>
<td valign="top"><strong>First-body patch</strong> (<code>light-screen-opp-hold-first-body-env.diff</code>, <code>AUDIT15_LS_HOLD=1</code>; hold only while the lend carries <code>firstBody</code>):
<ul>
<li>5 SNORLAX/CHANSEY chains go 2,658 -&gt; 0.</li>
<li>The EXEGGCUTE/ONIX first body <strong>stays 2,658</strong>, so it is <strong>REFUTED</strong> (<code>patch-ls-hold-acc/</code>).</li>
</ul>
<strong>Dominant-phase patch</strong> (<code>light-screen-opp-no-hold-env.diff</code>, <code>AUDIT15_LS_NOHOLD=1</code>; no hold):
<ul>
<li><strong>12 / 13</strong> live LS windows are 0 px. Only the SNORLAX/CHANSEY first body goes 0 -&gt; 2,658.</li>
<li>The accepted fixture goes <strong>0 -&gt; 2,658</strong> (<code>patch-ls-nohold/accepted-*.json</code>). Its own route, after Tackle, is a production <strong>decline</strong> (Tackle leaves the allocator host unknown).</li>
</ul>
<strong>D4 option (b):</strong> among the live-reachable routes measured here the no-hold phase dominates (9 of 10 opponent windows). The supervisor decides whether to flip the recorded phase or keep the accepted one and document this.</td></tr>
</tbody>
</table>

### Non-defect table

<table>
<thead>
<tr><th>Row(s)</th><th>Residual</th><th>Evidence</th><th>Verdict</th></tr>
</thead>
<tbody>
<tr><td valign="top">Flamethrower windows measured from activation (all 37 windows, incl. the controls, before the shift)</td>
<td valign="top">212,395 (opp) / 238,354 (ply) px, rows 0..128</td>
<td valign="top">The accepted order-consumer fixtures frame Flamethrower at activation + 4 with ageOffset -11, so production age 0 = activation + 15 (audit 14 "210:-15"). With <code>ageOffset -15</code> every Flamethrower window is 0 px, chains and controls</td>
<td valign="top"><strong>ARTIFACT</strong> (checker alignment; fixed in <code>audit15Fixtures.py</code> AGE_OFFSET). Blaze Kick likewise uses -10</td></tr>
<tr><td valign="top">Light Screen opponent after <strong>Will-O-Wisp + Status_Burn</strong> (SNORLAX/CHANSEY)</td>
<td valign="top">155,164 px (fallback)</td>
<td valign="top"><code>live=0</code>: the status animation invalidates the allocator host (<code>historyKnown</code> false), as later48 documents</td>
<td valign="top"><strong>DECLINE</strong> (correct fallback, no live claim)</td></tr>
<tr><td valign="top">Light Screen opponent after <strong>Tackle</strong> (SNORLAX/CHANSEY and the accepted EXEGGCUTE/ONIX route)</td>
<td valign="top">155,164 / 155,248 px (fallback)</td>
<td valign="top"><code>live=0</code>, allocator input undefined: Tackle (+hit) is not an allocator net-zero unit. Note that the accepted live fixture's own ROM route is therefore a decline in production</td>
<td valign="top"><strong>DECLINE</strong></td></tr>
<tr><td valign="top">Thunderbolt after <strong>Giga Drain</strong> (opponent attacker SNORLAX)</td>
<td valign="top">0 px (237 / 237 rows x 3 windows, r1 == r2, <code>receipts/gd/</code>)</td>
<td valign="top">In <code>receipts/main</code> the order host reports <code>no EXACT plan: body 202:opponent</code> and the adapter declines (3,845,762 px fallback). <code>postkoHostReplay.ts</code> passes <strong>no geometry-plan callback</strong>, which production's orchestrator supplies (<code>liveSpriteOrderBodyPlanAt</code>, <code>73efbff63</code>). <code>liveMoveGeometrySpriteOrderPlanText(202, side, SNORLAX/CHANSEY)</code> is defined on both sides. <code>audit15GdCheck.ts</code> replays the same history with the callback: the order is KNOWN, Thunderbolt is live and exact, and Flamethrower (opponent side) is exact</td>
<td valign="top"><strong>EXACT</strong> (lend-neutral consumer). <strong>Harness note:</strong> <code>replayPostKoTurnsThroughHost</code> lacks <code>bodyPlanAt</code></td></tr>
<tr><td valign="top">Flamethrower / Thunderbolt / Reflect / Protect / Light Screen (player side) chains</td>
<td valign="top">0 px</td>
<td valign="top">The entry-lend control is also 0 px on every one (Flamethrower is documented pixel-neutral, order-consumer-prep 0/130 ages). These rows prove the post-unit render is exact (x2 / palettes / healthbox / message box / BG, and the allocator host for the walls and Protect), not the lend's value</td>
<td valign="top"><strong>EXACT, lend-neutral</strong></td></tr>
</tbody>
</table>

## 2. Coverage (`receipts/coverage-grid.md`; `python3 tools/integration/audit15Coverage.py <receipts>`)

The unit side is SNORLAX (faster, one move x4) and the consumer side is CHANSEY, unless the pair is EXEGGCUTE/ONIX. Each cell reads
"0-px live windows / windows". "discr" counts the 0-px windows whose entry-lend control is non-zero.

| Unit (tonight's fold) | Consumer: side, cell |
|---|---|
| Petal Dance, retained continuation (`024efddfd`) | Blaze Kick ply 3/3 (discr 3), Heal Bell ply 3/3 (discr 3), Flamethrower ply 3/3, Thunderbolt ply 3/3 |
| Dig unleash, retained continuation | Blaze Kick ply 1/1 (discr 1), Flamethrower ply 1/1, Thunderbolt ply 1/1 |
| Solar Beam charge / unleash by turn (`6a7af5b47`) | Blaze Kick ply 3/3 (discr 3), Heal Bell ply 3/3 (discr 3), Flamethrower 3/3, Thunderbolt 3/3 |
| Will-O-Wisp + Status_Burn (BRN) | Blaze Kick ply 3/3 (discr 3), Flamethrower ply 3/3 and opp 3/3, Thunderbolt ply 3/3; Light Screen opp **declined** |
| Fire Spin + TURN_TRAP (Fire Spin) | Blaze Kick ply 3/3 (discr 2; c2 is after the TURN_TRAP), Flamethrower 3/3, Thunderbolt 3/3 |
| Hydro Pump | Blaze Kick ply 3/3 (discr 3) and opp 3/3 (discr 2); Heal Bell ply 3/3 (discr 3) and opp 3/3 (discr 3); Flamethrower both sides 6/6; Light Screen opp 0/1 (PHASE) |
| Icy Wind + stat (SNORLAX/CHANSEY) (`213918b23`) | Blaze Kick ply 3/3 (discr 1), Flamethrower ply 3/3 and opp 3/3 |
| Ice Beam (net-zero, `a556f6cdf`) | Blaze Kick ply 3/3, Heal Bell ply 3/3 (discr 3), Reflect ply 1/1 and opp 1/1, Light Screen opp 0/1 (PHASE), Protect ply 2/2 (Protect blocked Ice Beam: Protect after Protect) |
| Double Team + stat (net-zero) | Protect ply 2/2 and opp 2/2, Reflect opp 1/1, Light Screen ply 1/1, Thunderbolt ply 3/3; Light Screen opp 0/1 (PHASE), EXEGGCUTE/ONIX 0/1 (PHASE) |
| Faint Attack (net-zero) | Light Screen ply 1/1; Light Screen opp 0/1 (PHASE), EXEGGCUTE/ONIX 0/1 (PHASE) |
| Swift (net-zero) | Thunderbolt ply 3/3, Protect ply 2/2 (Protect after Protect); Light Screen opp 0/1 (PHASE), EXEGGCUTE/ONIX 0/1 (PHASE) |
| Giga Drain (`73efbff63`) | Flamethrower opp 3/3; Thunderbolt ply 3/3 **via `audit15GdCheck.ts`** (with the geometry callback; the grid script reads `main/`, where these 3 show "declined") |
| Tackle | Light Screen opp **declined** (both pairs) |
| controls (first body; c1 / c2 = after the consumer's own earlier body) | Blaze Kick 5/5, Heal Bell 6/6, Flamethrower 6/6, Thunderbolt 3/3, Reflect 2/2, Light Screen ply 1/1, opp SNORLAX/CHANSEY 1/1, opp EXEGGCUTE/ONIX 0/1 (PHASE) |

### Not reached (time-boxed)

- **Giga Drain -> Double Team, and a known predicted-flip species pair.** SNORLAX/CHANSEY Giga Drain -> Thunderbolt / Flamethrower was
  reached (`audit15GdCheck.ts`). Whether SNORLAX/CHANSEY is a flip pair was not checked.
- **Trace / double-Intimidate battle-start seeds.** The replay helper begins every turn with a prompt cycle, so it has no pre-prompt
  battle-start segment.
- **The deferred lend after Sand-Attack / Mud-Slap / Rain Dance.** This needs the pinned Random2 words. The `wordsChain` fixture mode
  exists, but the allocator path does not.
- **Dig / Return later bodies.** later48 covers these.
- **Follow Me.** It is doubles-only, so it was not staged.
- **The census-ranked consumer per unit.** Consumers were chosen by pixel order-sensitivity (docs/order-consumer-prep.md); the census was
  not consulted.
- **Only two species pairs.**

## 3. Reproduction (run from workspace/; direct mGBA only)

```
sh tools/integration/audit15Run.sh <receipt-dir> [scratch-dir]   # ~3 min: stage (== committed) -> probe -> derive (== committed) -> main + entry passes
python3 tools/integration/audit15Coverage.py <receipt-dir>        # coverage grid + totals
node --experimental-strip-types --no-warnings tools/integration/audit15GdCheck.ts <out.json> tools/integration/fixtures/audit-15/fixtures/giga-drain-*-c?.json   # with the geometry callback
sh tools/integration/audit15Vblank.sh <dir> && python3 tools/integration/audit15VblankTable.py <dir>   # BLDALPHA IO vs buffer, 2 runs each
sh tools/integration/issue151Counters.sh <dir> 8 tools/integration/fixtures/audit-15/fixtures/{ctl,double-team,swift}-light-screen-opp-c0.json   # lag ages
node --experimental-strip-types --no-warnings tools/integration/audit15Diag.ts <fixture> <rgb-dir> 58 59 60   # bbox + shift -1/+1 (rgb kept by a manual prep48Probe run)
# patch proofs (always revert): from the repo root
git apply workspace/tools/integration/fixtures/audit-15/patches/light-screen-opp-no-hold-env.diff
AUDIT15_LS_NOHOLD=1 POKEBENCH_LIVE_PROBE_SHARE=1 node --experimental-strip-types --no-warnings tools/integration/audit15Check.ts tools/integration/fixtures/audit-15/fixtures /tmp/x.json swift-light-screen-opp-c
git checkout -- src
```

## 4. Receipts (`tools/integration/fixtures/audit-15/`)

`scenarios/` (65), `fixtures/` (142 consumer windows, `precedingTurns`), and `receipts/`:
- `main/` and `entry/`: per-scenario check JSON with per-row residual rows and r1 / r2 digests, plus `summary.txt`;
- `patch-ls-hold/`, `patch-ls-hold-acc/` and `patch-ls-nohold/`;
- `vblank/table.txt`, `run-digests.txt` and `lag-counters.txt`;
- `gd/check-gd.json` (the Giga Drain windows with the geometry callback);
- `coverage-grid.md`.

`patches/` holds the two env-gated diffs (`.gitattributes` `*.diff -whitespace`). No RGB dumps and no mGBA logs are committed.
