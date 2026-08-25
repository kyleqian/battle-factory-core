# Soak coverage baseline — 2026-08-25

Union census of every `tools/soak/randomRoundSoak.ts --coverage-json` report
the supervisor produced on 2026-08-25, merged with the soak's own exported
`mergeCoverageReports` through the new CLI
`tools/soak/mergeCoverageReports.ts`. It answers "after a day of policy
sweeps, what part of the Level-50 rental universe has the engine actually
run?" — so the next census can aim at what is still dark instead of sweeping
at random.

Every number below is read out of the committed JSON reports by the script in
§8; nothing is hand-typed. Coverage schema and the reading contract:
`tools/soak/randomRoundSoakCoverage.ts`.

## Headline

| Dimension | Executed / seen | Universe | % | Never |
| --- | --- | --- | --- | --- |
| Moves | 276 | 276 | 100.0% | 0 |
| Move effects | 166 | 166 | 100.0% | 0 |
| Species | 252 | 264 | 95.5% | 12 |
| Abilities (presence) | 70 | 71 | 98.6% | 1 |
| Held items (presence) | 40 | 40 | 100.0% | 0 |

**The move and effect universes are closed.** Every Level-50 corpus move and
every effect symbol those moves carry has been executed end-to-end at least
once across 57,378 battles / 1,557,223 move actions, with zero CRASH and zero
HANG in any contributing run. The residual gaps are all on the *party*
dimensions and all trace to one cause: no run ever reached carried streak 49
(`challengeNum` 7), the only tier whose rental range includes the
high-tier legendary sets 756–849.

## §1 Inputs

15 coverage reports, all `--vary-rng`. `carry` is `--start-carry`; `mode` is
`first-round` (`--first-round`, one round per seed) or `chained` (run to the
frame budget). OK/CRASH/HANG come from each report's paired per-seed
`<name>.json` `counts`.

| Report | Policy | Carry | Seeds | Mode | n | Battles | Turns | Move actions | OK | CRASH | HANG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cf-fr-c0-0-300` | coverage-fight | 0 | 0:300 | first-round | 300 | 847 | 18368 | 29893 | 300 | 0 | 0 |
| `cf-fr-c14-0-300` | coverage-fight | 14 | 0:300 | first-round | 300 | 966 | 20492 | 35297 | 300 | 0 | 0 |
| `cf-fr-c28-0-300` | coverage-fight | 28 | 0:300 | first-round | 300 | 765 | 11620 | 19361 | 300 | 0 | 0 |
| `cf-full-c0-0-20` | coverage-fight | 0 | 0:20 | chained | 20 | 1024 | 31258 | 44856 | 20 | 0 | 0 |
| `cf-full-c28-0-20` | coverage-fight | 28 | 0:20 | chained | 20 | 1137 | 32544 | 47014 | 20 | 0 | 0 |
| `full-c28-21-100` | full | 28 | 21:100 | chained | 79 | 1919 | 74170 | 85285 | 79 | 0 | 0 |
| `w-c0-113-200` | winning | 0 | 113:200 | chained | 87 | 8642 | 126739 | 225996 | 87 | 0 | 0 |
| `w-c14-113-200` | winning | 14 | 113:200 | chained | 87 | 8702 | 126673 | 226618 | 87 | 0 | 0 |
| `w-c28-113-200` | winning | 28 | 113:200 | chained | 87 | 8720 | 125741 | 224990 | 87 | 0 | 0 |
| `wc-c0-83-100` | winning-coverage | 0 | 83:100 | chained | 17 | 1805 | 23989 | 43498 | 17 | 0 | 0 |
| `wc-c14-83-100` | winning-coverage | 14 | 83:100 | chained | 17 | 1759 | 24265 | 44012 | 17 | 0 | 0 |
| `wc-c28-13-100` | winning-coverage | 28 | 13:100 | chained | 87 | 9056 | 123888 | 223584 | 87 | 0 | 0 |
| `ws-c0-113-200` | winning-swap | 0 | 113:200 | chained | 87 | 8659 | 122743 | 221000 | 87 | 0 | 0 |
| `ws-c14-83-100` | winning-swap | 14 | 83:100 | chained | 17 | 1677 | 24105 | 43339 | 17 | 0 | 0 |
| `ws-c28-83-100` | winning-swap | 28 | 83:100 | chained | 17 | 1700 | 23703 | 42480 | 17 | 0 | 0 |
| **union** | — | — | — | — | **1522** | **57378** | **910298** | **1557223** | **1522** | **0** | **0** |

Two same-day census runs are **not** in the union because they predate the
`--coverage-json` flag being passed and so wrote no coverage report:
`full-c0-0-100` and `full-c14-0-100` (per-seed results only, 100 + 100 seeds,
OK 100/100 each). Files under `census/old/` and any `gates-mid` directory are
out of scope by the step brief.

Deepest carried win streak observed anywhere in the union: **42**
(`wc-c28-13-100`); **0 of 1522 seeds reached 49**.

## §2 Union coverage (all 15 reports merged)

```
=== coverage ===
policy coverage-fight  seeds 1522 (0..99)  battles 57378  turns 910298  move actions 1557223
moves      276/276  executed (0 never)  [+74 outside corpus]
effects    166/166  executed (0 never)  [+29 outside corpus]
species    252/264  seen (12 never)
abilities   70/71   present (1 never)
items       40/40   present (0 never)
```

(The `policy` label on a cross-policy merge is the first input's — see the CLI
header. Per-report provenance is §1.)

Per side — distinct ids, and total observations:

| Dimension | Player distinct | Player obs | Opponent distinct | Opponent obs |
| --- | --- | --- | --- | --- |
| Moves | 326 | 766686 | 347 | 790537 |
| Effects | 184 | 766686 | 193 | 790537 |
| Species | 252 | 172134 | 252 | 172134 |
| Abilities | 68 | 57378 | 70 | 57378 |
| Items | 39 | 57376 | 40 | 57333 |

The player-side distinct move count (326) exceeds the 276-move universe
because those totals include the **74 outside-corpus moves** — 19,315
observations, of which 18,960 are Struggle (p7951 / o11009) and the remaining
**355 are called moves**: Metronome (p418 / o1052), Sleep Talk (p37 / o103),
Assist (o7), Nature Power (o7), Mirror Move (p1) reached 73 distinct moves no
rental set carries. Those are reported, never dropped (`outsideUniverse`), and
they are the reason a per-side "never executed" read needs care — see §4.

## §3 Per-policy-family coverage

Unions within each family, so the reader can see what each family adds on its
own. Family globs: winning-like = `w-*` + `ws-*` + `wc-*`; random = `full-*`;
coverage-fight = `cf-*`.

| Family | Reports | Seeds | Battles | Move actions | Moves | Effects | Species | Abilities | Items |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Winning-like (`w`/`ws`/`wc`) | 9 | 503 | 50720 | 1295517 | **276/276** | **166/166** | 252/264 | 70/71 | **40/40** |
| Random play (`full`) | 1 | 79 | 1919 | 85285 | 214/276 | 131/166 | 204/264 | 66/71 | 35/40 |
| Coverage-fight (`cf`) | 5 | 940 | 4739 | 176421 | 260/276 | 161/166 | 252/264 | 68/71 | 38/40 |
| **Union** | 15 | 1522 | 57378 | 1557223 | **276/276** | **166/166** | 252/264 | 70/71 | **40/40** |

Reading it:

- **Winning-like already closes the move and effect universes on its own.**
  Its 1.30M move actions over 50.7k deep-chained battles are where the
  saturation comes from; it adds nothing the union does not have.
- **Coverage-fight buys coverage per *battle*, not per action.** 260/276 moves
  and 252/264 species from 4,739 battles — 8% of the winning-like battle count
  and 14% of its move actions — and it matches the union's species reach
  exactly. Per move action it is by far the most efficient instrument; the
  16-move shortfall is a depth artefact (its `--first-round` runs stop at one
  round), not a policy limit.
- **Random play is the weakest per battle and per action** (214/276 moves from
  85k actions) and is dominated on every dimension. It is not worth spending
  census minutes on for coverage; keep it for crash-shape diversity only.
- Nothing any family reaches is outside what the union reaches: there is no
  family-exclusive id in any dimension.

## §4 Never-executed effects (union)

**None. 0 of 166.** Every effect symbol carried by a Level-50 corpus move has
been executed at least once. There is no table to draw and no WHY to assign.

The nearest residual — the honest "what is one-sided" read — is effects the
**player side** never executed, which is 2 of 166:

| Effect | Player | Opponent | WHY |
| --- | --- | --- | --- |
| `EFFECT_HIDDEN_POWER` | 0 | 8 | `no-L50-carrier-drafted` — see §5 (Hidden Power) |
| `EFFECT_SPECIAL_ATTACK_DOWN_HIT` | 0 | 8 | `no-L50-carrier-drafted` — see §5 (Mist Ball) |

## §5 Never-executed moves (union)

**None. 0 of 276.**

The residual, again, is one-sidedness: 4 of the 276 corpus moves were executed
only by an opponent. `carriers` counts corpus sets in the Level-50 universe
that list the move; `reachable` counts those in a rental range for
`challengeNum` 0–6, i.e. the tiers any of these runs actually sampled.

| Move | Opp. execs | Carriers | Reachable | Carrier species | WHY |
| --- | --- | --- | --- | --- | --- |
| 237 HIDDEN POWER | 8 | 1 | 1 | UNOWN | `no-L50-carrier-drafted` — its only carrier is set 126 (Unown), 1 of the 90 sets in the `challengeNum`-0-only range 110–199, and Unown was never drafted or faced (§6) |
| 296 MIST BALL | 8 | 2 | 0 | LATIAS | `no-L50-carrier-drafted` — carriers 842–845 are high-tier (`challengeNum` 7), never sampled |
| 295 LUSTER PURGE | 2 | 2 | 0 | LATIOS | `no-L50-carrier-drafted` — carriers 846–849 are high-tier (`challengeNum` 7), never sampled |
| 90 FISSURE | 8 | 9 | 9 | DUGTRIO, WHISCASH, DONPHAN, WAILORD, WALREIN | `unknown` — 9 reachable carriers exist, but the reports cannot tell a chosen Fissure from a Metronome-called one (see the caveat below), so neither `carried-never-chosen` nor `no-L50-carrier-drafted` can be asserted |

**Caveat on all four rows:** with 0 reachable carriers, Mist Ball's and Luster
Purge's 8 and 2 executions are *necessarily* called moves (Metronome / Sleep
Talk), and Hidden Power's 8 are too, since its single carrier was never
drafted. The coverage instrument credits whatever move the receipt names, so a
called move counts as an execution of that move. This is the same mechanism
that produced the 74 outside-corpus moves in §2, and it means "executed" in
this doc means "the engine ran that move's script", not "a policy chose it".

## §6 Species / abilities / items never seen (union)

### §6a Species never seen — 12 of 264

`carriers` = sets in the Level-50 universe with that species; `challengeNum`
= the rental-range tiers (`factory-round-policy.json`
`rentalSelection.ranges.level50`, index = challengeNum) those sets fall in.

| Id | Species | Carriers | Set range | Reachable at challengeNum | WHY |
| --- | --- | --- | --- | --- | --- |
| 144 | ARTICUNO | 4 | 756–789 | 7 | `no-L50-carrier-drafted` |
| 145 | ZAPDOS | 4 | 757–790 | 7 | `no-L50-carrier-drafted` |
| 146 | MOLTRES | 4 | 758–791 | 7 | `no-L50-carrier-drafted` |
| 201 | UNOWN | 1 | 126–126 | 0 | `no-L50-carrier-drafted` |
| 243 | RAIKOU | 4 | 759–792 | 7 | `no-L50-carrier-drafted` |
| 244 | ENTEI | 4 | 760–793 | 7 | `no-L50-carrier-drafted` |
| 245 | SUICUNE | 4 | 761–794 | 7 | `no-L50-carrier-drafted` |
| 401 | REGIROCK | 6 | 762–837 | 7 | `no-L50-carrier-drafted` |
| 402 | REGICE | 6 | 763–839 | 7 | `no-L50-carrier-drafted` |
| 403 | REGISTEEL | 6 | 764–841 | 7 | `no-L50-carrier-drafted` |
| 407 | LATIAS | 8 | 765–845 | 7 | `no-L50-carrier-drafted` |
| 408 | LATIOS | 8 | 766–849 | 7 | `no-L50-carrier-drafted` |

Eleven of the twelve are **high-tier-only**: their sets live in 756–849, and
the only Level-50 rental range covering that band is index 7 (`372–849`),
reached at `challengeNum` 7 — carried streak ≥ 49. The union's deepest streak
is 42 and 0 of 1522 seeds reached 49, so no draft or opponent generation ever
sampled that band. Verified directly: a 4-seed
`--policy coverage-fight --start-carry 49 --first-round` probe (2.0 s) already
surfaced LATIAS (p5), LATIOS (o1) and REGIROCK (o1).

UNOWN is the odd one out: its single set 126 is only in range index 0
(`110–199`, `challengeNum` 0), which is sampled *only* by a carry-0 run's very
first round — 1 set out of 90, six rentals offered, so ≈ 6/90 per draft. It is
a sampling gap, not a depth gap.

### §6b Abilities never present — 1 of 71

Presence, not activation: this dimension records the ability of the two
**active battlers at battle start**, so an ability counted here may never have
fired, and an ability on a benched party member is never counted at all.

| Id | Ability | Corpus carriers | Party sightings of those species | WHY |
| --- | --- | --- | --- | --- |
| 36 | `ABILITY_TRACE` | PORYGON (slot 0) ×2 sets; PORYGON2 (slot 0) ×4 sets; GARDEVOIR (slot 1) ×8 sets | PORYGON p1573 / o1683, PORYGON2 p48 / o75, GARDEVOIR p56 / o74 | `unknown` |

This one is **not** a draft gap and deserves a look. All three carrier species
were drafted and faced — Porygon alone appears in 3,256 party slots across the
union — yet `ABILITY_TRACE` was never present on a lead in 114,756 lead
samples. Porygon and Porygon2 have Trace in slot 0 with no second ability, so
`factoryCorpusParty.ts:252`'s `secondAbility === 0 ? 0 : instance.abilitySlot`
should resolve them to Trace unconditionally. Either these species never once
led a battle (possible but improbable at that sighting count), or lead ability
resolution drops Trace. The reports cannot distinguish the two, so the WHY is
`unknown` — §7 has the cheap probe.

### §6c Held items never present — 0 of 40

None. All 40 corpus held items were present on a lead at least once. Same
presence-not-consumption caveat as abilities: an item counted here may never
have triggered.

## §7 Recommendations

Cheapest first. "Seed-minutes" are measured against the carry-49 probe run for
this doc: 4 first-round `coverage-fight` seeds in **2.0 s** single-process
(≈ 0.5 s/seed); chained runs cost roughly 60–90× that per seed at the 1M-frame
budget, and `--parallel N` divides wall-clock by ~N.

1. **`--start-carry 49` first-round coverage-fight, seeds 0:300** — closes 11
   of the 12 species gaps and both legendary-move one-sided rows (§5).
   `npm run soak -- --policy coverage-fight --vary-rng --first-round
   --start-carry 49 --seeds 0:300 --render-every 0 --parallel 3
   --coverage-json .../cf-fr-c49-0-300.coverage.json`. **≈ 2.5 seed-minutes**
   serial, under a minute at `--parallel 3`. Already proven to reach the band
   in 4 seeds. This is the single highest-value next run by a wide margin.
2. **Settle the `ABILITY_TRACE` question before spending any more soak time on
   it** — it is a 5-minute read, not a census: check whether Porygon/Porygon2
   ever occupy the lead slot at battle start, and whether the lead's
   `rulesContext.battlers[i].ability` is populated for a slot-0-only-ability
   species. If resolution is dropping Trace that is an engine bug worth an
   ISSUES entry; if it is lead sampling, the coverage instrument should sample
   the whole party's abilities, not just the two leads. **≈ 0 seed-minutes.**
3. **Carry-0 first-round sweep for UNOWN, seeds 300:1500** — Unown is ≈ 6/90
   per carry-0 draft, so ~1200 first-round seeds gives a high chance of at
   least one sighting and, with it, the only in-corpus Hidden Power carrier.
   `--policy coverage-fight --vary-rng --first-round --start-carry 0 --seeds
   300:1500 --parallel 4`. **≈ 10 seed-minutes** serial, ~2.5 wall-minutes at
   `--parallel 4`. Lower value than (1); do it only if a *drafted* Hidden Power
   matters.
4. **Force a player-side Fissure to resolve §5's `unknown`** — no policy
   reliably drafts and picks a 30%-accuracy OHKO move, so this is a
   `mechanicLab` job, not a soak: `overrides.parties` with a player Dugtrio
   (set 564's exact moveset, Fissure in slot 0) against any three legal
   opponents, and a nested trace that commits slot 0 twice. Deterministic, one
   trace, **0 seed-minutes**; it also gives the OHKO path a real oracle
   receipt, which no soak run does today.
5. **Retire `--policy full` from coverage census duty.** It is dominated on
   every dimension (§3) and costs 85k move actions to reach 214/276 moves,
   which coverage-fight reaches with a fraction of the battles. Keep it in the
   crash rotation for decision-shape diversity; stop paying census minutes for
   its coverage. **Saves ≈ 8 seed-minutes per census round.**

## §8 Method

The union and the three family unions, verbatim (with `CENSUS` bound to the
supervisor's census directory):

```sh
CENSUS=<census dir>

# §2 union — all 15 reports, and the JSON the §4-§6 lists are generated from
node --experimental-strip-types tools/soak/mergeCoverageReports.ts \
  "$CENSUS"/*.coverage.json --json /tmp/union.coverage.json

# §3 winning-like
node --experimental-strip-types tools/soak/mergeCoverageReports.ts \
  "$CENSUS"/w-*.coverage.json "$CENSUS"/ws-*.coverage.json "$CENSUS"/wc-*.coverage.json

# §3 random play
node --experimental-strip-types tools/soak/mergeCoverageReports.ts "$CENSUS"/full-*.coverage.json

# §3 coverage-fight
node --experimental-strip-types tools/soak/mergeCoverageReports.ts "$CENSUS"/cf-*.coverage.json
```

The CLI does not reimplement the merge: it calls the soak's exported
`mergeCoverageReports` (`tools/soak/randomRoundSoakCoverage.ts`), the same
function the `--parallel` fan-out parent uses, and prints via the same
`coverageSummaryLines`. So a cross-run union and a cross-slice union are
computed and rendered by identical code.

§1's OK/CRASH/HANG, §4–§6's lists, and the carrier/tier columns are generated
from `/tmp/union.coverage.json` plus the committed corpus tables, never typed
by hand:

```js
// node <this>.mjs, run from the workspace root
import fs from "node:fs";
const rd = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const u = rd("/tmp/union.coverage.json");
const mons = rd("src/data/gen/battle-frontier-mons.json").entries;
const stats = rd("src/data/gen/species-stats.json").species;
const pol = rd("src/data/gen/factory-round-policy.json").rentalSelection.ranges.level50;
const nameById = new Map(stats.map((r) => [r.id, r.name]));
const statsBySym = new Map(stats.map((r) => [r.name, r]));
const setIds = []; const seen = new Set();
for (const r of pol) for (let i = r.start; i <= r.end; i++) if (!seen.has(i)) { seen.add(i); setIds.push(i); }
setIds.sort((a, b) => a - b);
const tiersFor = (s) => pol.map((r, i) => (s >= r.start && s <= r.end ? i : -1)).filter((i) => i >= 0);

// §4 / §5 — never executed by ANY run (both empty in this baseline)
console.log(u.moves.neverObserved, u.effects.neverObserved);

// §5 residual — in-universe moves the player never executed, with carrier/reach
for (const e of u.moves.entries.filter((x) => x.inUniverse && x.player === 0)) {
  const sym = `MOVE_${e.name.replace(/[ -]/g, "_")}`;
  const carriers = setIds.filter((s) => (mons[s]?.moves ?? []).includes(sym));
  console.log(e.id, e.name, e.opponent, carriers.length,
    carriers.filter((s) => tiersFor(s).some((t) => t < 7)).length,
    [...new Set(carriers.map((s) => mons[s].species))]);
}

// §6a — species never seen, with carrier sets and the challengeNum tiers reaching them
for (const e of u.species.neverObserved) {
  const carriers = setIds.filter((s) => mons[s]?.species === nameById.get(e.id));
  console.log(e.id, e.name, carriers.length, carriers.at(0), carriers.at(-1),
    [...new Set(carriers.flatMap(tiersFor))].sort((a, b) => a - b));
}

// §6b — abilities never present, with corpus carriers by slot
for (const e of u.abilities.neverObserved) {
  const carriers = new Map();
  for (const s of setIds) {
    const slot = statsBySym.get(mons[s]?.species)?.abilities.indexOf(e.name) ?? -1;
    if (slot >= 0) { const k = `${mons[s].species} (slot ${slot})`; carriers.set(k, (carriers.get(k) ?? 0) + 1); }
  }
  console.log(e.id, e.name, [...carriers]);
}

// §6c — items never present
console.log(u.items.neverObserved);
```

The §1 depth column and the OK/CRASH/HANG columns come from the paired
per-seed results next to each coverage report:

```js
for (const f of fs.readdirSync(CENSUS).filter((f) => f.endsWith(".json") && !f.endsWith(".coverage.json"))) {
  const r = rd(`${CENSUS}/${f}`);
  console.log(f, r.counts, Math.max(...r.results.map((x) => x.maxCarriedWinStreak ?? 0)));
}
```

### Caveat — what "executed" means here

The coverage instrument credits a move from the battle kernel's
`STRINGID_USEDMOVE` receipt and its frozen `actionSnapshot`
(`randomRoundSoakCoverage.ts` header). Two consequences run through every
number above:

- **A move that fails before its attack string is not counted as executed.**
  A turn lost to flinch, full paralysis, sleep, freeze, confusion self-hit, or
  a disobedience-style pre-attack abort never prints `STRINGID_USEDMOVE`, so
  it contributes nothing — including to the *effect* tally, which is derived
  from the executed move. "276/276 executed" therefore means every move
  reached its attack string at least once, not that every move's full effect
  path resolved.
- **A called move is credited to the move that ran, not to the caller.**
  Metronome, Sleep Talk, Assist, Nature Power and Mirror Move contributed 355
  observations across 73 moves no rental set carries (§2), and they can also
  credit an in-corpus move nobody drafted (§5). The instrument cannot
  distinguish a chosen move from a called one; where that matters, this doc
  says `unknown`.

Abilities and items are **presence on the active lead at battle start**, never
activation or consumption, and never sample benched party members — see §6b.
