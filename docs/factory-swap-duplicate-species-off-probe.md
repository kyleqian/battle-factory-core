# S8 OFF — duplicate-species swap rejection probe

Evidence checkpoint only. This adds no controller, renderer, production UI,
or acceptance trace. The compact fixture is
`src/data/gen/battle1-swap-duplicate-species-off.json`; reproduce it with the
teardown-safe probe below.

```sh
taskdir=$(mktemp -d)
python3 tools/run-mgba-probe.py "$taskdir/duplicate.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/stage-swap-duplicate-species-off.py "$taskdir/duplicate.json"
```

The normal OFF Battle-1 swap offer cannot express the branch: its offered
Grovyle/Murkrow/Pidgeotto do not duplicate the remaining Magby/Bayleef. The
probe replays only the established canonical prefix through the enemy picker
(tick 29935), then changes enemy slot 0's encrypted `MON_DATA_SPECIES` from
Grovyle (278) to Magby (240). Magby is player slot 1 while the chosen
replacement slot is 0. The probe updates the BoxPokemon checksum required to
read that identity and asserts that the only enemy bytes changed are the two
species bytes plus that two-byte integrity field. No player-party, rental,
task, or screen staging is supplied or changed.

## Pinned OFF result

The transition-install A at 29935 is rejected. After its release, fresh A at
**29937** executes the duplicate branch, not `Swap_AskAcceptMon`: task
ownership becomes `Swap_TaskCantHaveSameMons` state 0 and `monSwapped` stays
false. The message and enlarged mon-picture chrome settle to input-ready
state 1 at **29961**; B at 29938 is rejected while B at 29961 is accepted and
starts closing the picture at 29962. The source restores `Select POKéMON to
accept.` at 29982 and installs the enemy picker at 29984. RIGHT at that
installation frame is rejected; after a release, fresh RIGHT at **29986**
moves cursor 0 → 1.

Throughout the rejection/return window `gSpecialVar_Result` remains TRUE,
the original player party and all six rental records are byte-identical, and
the enemy party is byte-identical to the staged value. Thus
`CopySwappedMonData` is not reached; the sole intentional identity difference
is the staged enemy species used to exercise this otherwise unavailable
source path. The fixture contains only RAM/task facts and raw RGB888 hashes,
not PNGs, screenshots, or framebuffer assets.

## Source contract

`Swap_ActionMon` checks the enemy cursor through `Swap_AlreadyHasSameSpecies`
before opening the normal accept prompt (`battle_factory_screen.c:4039-4062`).
That predicate skips `playerMonId` and compares the offered species against
the other two player rentals (`:4162-4173`). On match,
`Swap_TaskCantHaveSameMons` opens the mon picture, prints
`gText_SamePkmnInPartyAlready`, waits for A/B, then closes/reconstructs the
same enemy picker (`:4120-4159`). The accepted-swap-only copy routine is
separate (`CopySwappedMonData`, `:2350-2361`) and is intentionally absent
from this fixture's task path.

## Dense live-render audit

`npm run compare:factory-swap-duplicate-species` reruns this probe through
`tools/run-mgba-probe.py`, writes raw RGB frames only to a fresh temporary
directory, and compares all 52 staged picker/error/return frames against the
normal engine renderer. The initial checkpoint is 0/52 exact with 99,464
aggregate differing pixels (+0 381px, peak +27 5,010px, +51 2,029px).
The +0 residual exposes the source-owned loaded-display distinction: changing
the logical enemy species does not replace the already-created GROVYLE picker
chrome. Later residuals bound the still-open OpenMonPic/message/close
composition. No framebuffer output is committed or consumed by production.
