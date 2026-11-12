# reseed85 predictions (committed BEFORE any ROM probe or patched census)

Base: master `005101dfc` (production src `9f3b877d`), measured on a git-archive copy with hist73's instruments
(`hist73AllocatorCensus.ts` 10 `--index-from` shards -> `hist73Merge.py` -> `hist73Chains.py` / `hist73ReseedBlockers.py`).

## Residual on the base (seeds 0..999)

`sprite allocator history unknown`: **52 commands / 5,145 frames** (`chains-base-seeds0-999.json`; chain lengths 1:1, 2:48, 4:3).
51 / 5,066 are post-KO send-out reseeds blocked by the ORDER host (`reseed-blockers-base.json`, chain `command party-summary +
command switch-in`, the reseed's tracker invalid with `no EXACT plan: <unit>`):

| blocking unit (order invalid reason) | cmds / frames | battles |
|---|---|---|
| Sand-Attack 28 (opponent 14 / 1,383, player 4 / 457) | 18 / 1,840 | 11 393 402 607 724 / 85 611 799 |
| Rain Dance 240 (opponent 9 / 705, player 4 / 413) | 13 / 1,118 | 197 420 / 106 117 397 821 |
| Mud-Slap 189 (player 7 / 720, opponent 4 / 445) | 11 / 1,165 | 98 304 446 678 718 / 184 277 634 780 |
| RAIN_CONTINUES (General_Rain) | 5 / 486 | 384 528 624 |
| Ice Ball 301 (opponent) | 2 / 246 | 785 |
| **words units total** | **49 / 4,855** | |
| Astonish 310 (player; not a words unit: no order plan) | 2 / 211 | 615 871 |
| Struggle 165 (not a live adapter) | 1 / 79 | 813 |

Every declined consumer is a PLANS allocator consumer: Protect 182, Light Screen 113, Reflect 115, Magic Coat 277, Barrier 112.

## Mechanism (source; predicted)

The reseed (`reseedLiveSpriteAllocatorAfterSendOut`, `liveSpriteAllocatorReseedable`) reads only `lastUnit` and the post-unit view's
role isomorphism (`spriteOrderEntryLabelRelabel`): battler slots, occupant roles and the OCCUPIED set (the free set is only checked as
the complement, its order is never read). In `applySpriteOrderUnitPlan` occupancy evolves without the free ORDER: a create takes the
lowest (`f`) / highest (`e`) open slot, a destroy token names a slot (`o`), a survivor (`c`) or a unit creation (`n`); the order only
breaks ties inside a destroy group (`pw`) and is the complement check. So the occupancy after `faint + party-summary-next +
next-mon-send-out` (and any planned body in between) is a function of the occupancy before them, not of the free order.

A words unit (28, 189, 240, 291, 301, RAIN_CONTINUES) is allocator-net-zero (`LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS` /
`_GENERAL_ANIMATIONS`: prep44 / prep52 receipts): its own words reorder the free slots but its body ends with the occupancy it began
with. Hence the order host can know the post-send-out occupancy WORD-FREE: an **occupancy shadow** = the tracker just before the
words unit's own event (known), with `lastUnit` set to the body, replayed through the pending marker's `deferred.units` with the
production `applySpriteOrderPresentationEvent`. Its free ORDER is wrong (never lent); its occupied set, battler slots and roles are
exact. The reseed may read the shadow when the real tracker is unknown only because of a words marker.

Temp patch (`reseed85-temp-src.diff`, `src/engine/liveSpriteOrderHost.ts` only): the host keeps `deferredOccupancy` (the shadow
start) while a words marker is pending (a nested words unit keeps the replayed shadow; dropped with the marker); the reseed predicate
falls back to the replayed shadow. No lend, plan, words, RNG or gameplay path changes.

## Predictions

- **P1 (ROM occupancy):** after a words unit (Sand-Attack, Mud-Slap, Rain Dance + RAIN_CONTINUES) by the opponent lead, its KO by the
  player and the opponent's summary + send-out, the inUse mask at the next allocator consumer's activation (Protect / Reflect /
  Light Screen, either side) EQUALS the mask of the control route (the words unit replaced by an allocator-net-zero non-words body
  of the same shape) and is role-isomorphic to the known entry (9 occupied slots: 2 battlers, 2 healthbox mains, the shadow, the
  4 healthbox halves 60..63), while the free ORDER (`sSpriteOrder` filtered to free slots) at that activation DIFFERS between the words
  route and the control for at least one scenario (the order is words-dependent; the occupancy is not). The consumer body's created
  slot set (mask changes during the body) equals the control's.
- **P2 (window pixels):** with the temp patch, the allocator consumer windows after words unit -> KO -> send-out go LIVE through the
  production renderer (allocator reseeded) and match the ROM with **0 px every row** (>= 6 windows; both consumer sides; >= 2 species
  pairs). On the base the same windows decline `sprite allocator history unknown`. An order consumer after the same chain (Water
  Pulse 352) is live with 0 px on BOTH base and patch (the deferred replay already covers it; the patch must not change it).
- **P3 (census, seeds 0..999, base vs patched copy):** **+49 commands / +4,855 frames** live (every words-unit reseed group clears:
  Sand-Attack 18 / 1,840, Mud-Slap 11 / 1,165, Rain Dance 13 / 1,118, RAIN_CONTINUES 5 / 486, Ice Ball 2 / 246); Astonish 2 / 211 and
  Struggle 1 / 79 stay; the command KEY sequence (battle, kind, moveId, side, attacker, target), presented frames per command and the
  battle digests (`5cc95d1eace6` merged) identical; 0 live -> fallback.
- **P4 (pins):** the patch moves no existing pin that asserts the reseed is refused after a words marker unless such a test exists;
  predicted: the related allocator / order-host / words / post-KO test files pass unchanged (a fold adds new pins for the shadow).

Resume conditions named in advance: Astonish 310 (no order plan, not a words marker: needs either an Astonish order plan or an
"allocator-net-zero body without a plan" shadow, a separate audit); Struggle (not a live adapter).
