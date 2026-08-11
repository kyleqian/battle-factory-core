# Family-B Cluster-3 Battle Scene OFF evidence

This SIDE-lane checkpoint adds no interpreter, controller, renderer, census,
or production-engine code. It corroborates the two volatile-status cases from
[`set-move-effect-family-b-notes.md` §3.7–3.8](set-move-effect-family-b-notes.md)
against the stock ROM under the `battle-scene-off` oracle profile. Rapid Spin
is deliberately outside this receipt.

## Common staging contract

Both `mechanicLab` scenarios build three complete legal Pokémon per side
before `CB2_InitBattle`. Every party member uses its single available Gen-3
ability slot. All four active-opponent move slots are identical, so the
Factory AI still makes its normal decision while every legal choice reaches
the intended case. All six initial party checksums are valid.

Speeds are strictly ordered. In the Mean Look receipt, opponent Murkrow is 111
and player Shuckle is 9; in the Nightmare receipt, player Haunter is 103 and
opponent Shuckle is 10. There is no speed-tie `Random()` ambiguity.

Every relied-on frame belongs to a committed 25-frame capture grid. Each final
scenario was run twice from a fresh oracle snapshot; the complete
`manifest.json` files compare byte-for-byte. Oracle stdout was redirected to
scratch files because `bin/oracle lab` otherwise floods the terminal.

## 1. Mean Look / `MOVE_EFFECT_PREVENT_ESCAPE`

[`mechanic-mean-look-release-off.json`](../tools/battle-lab/mechanic-mean-look-release-off.json)
stages dossier carrier `FRONTIER_MON_MURKROW_2` (set 289): Murkrow with its
stock Quirky nature, BrightPowder, and single Insomnia ability. Its four
opponent slots are all Mean Look. The slower player Shuckle first uses Splash,
attempts a party switch while trapped, then uses Roar to remove Murkrow, and
repeats the same party-switch path.

| Receipt field | SHA-256 / value |
| --- | --- |
| Scenario | `a4a9d26d100fd88c87b141fcfc2b825f829b89cb7daf168ad2a27d87f705a7a9` |
| Full manifest, run 1 | `716ef8c33fdc87453c2d9798c9992e54e62fed17742ce6280fc421e371708666` |
| Full manifest, run 2 | `716ef8c33fdc87453c2d9798c9992e54e62fed17742ce6280fc421e371708666` |
| Capture grid | frames 0–3225 inclusive, step 25, 130 captures |

`STATUS2_ESCAPE_PREVENTION` is `1 << 26`, or `67108864`. Contrary to the
dossier's conservative public-manifest caveat, the current manifest directly
exposes the active battler's full `status2`.

| Frame | Raw RGB888 framebuffer SHA-256 | RNG | Player party index / `status2` | Shuckle PP | Opponent party index / species / PP | Observed fact |
| ---: | --- | ---: | --- | --- | --- | --- |
| 0 | `189baec6d1ebbc45a0f588b58bf284991ee02888adc2ec242e29f1238e1e19c5` | 919694434 | 0 / 0 | 40/20/40/40 | 0 / Murkrow / 5/5/5/5 | Untrapped initial state |
| 125 | `31f99d3d62758ea1c3241f0a9f8cae808f4e1fac16eeecaa2416252b5ed2ae8a` | 919694434 | 0 / 67108864 | 40/20/40/40 | 0 / Murkrow / 5/4/5/5 | Mean Look spent one selected PP, set the bit, and caused no visible RNG movement |
| 1000 | `d5f23feeffeb304a0b11ef440f9f7a729022ebf4d7adab7664fc8baf7cd791df` | 1250713408 | 0 / 67108864 | 39/20/40/40 | 0 / Murkrow / 5/4/5/5 | Party screen visibly says “SHUCKLE can't be switched out!”; active party index remains 0 |
| 1650 | `365723fa760537b57888dd2506fa91554d6d50cae95152233df7323b8621e312` | 530917129 | 0 / 0 | 39/19/40/40 | 1 / Shuckle / 5/5/5/5 | Roar spent PP, removed Murkrow, and the trap bit cleared at the opponent identity change |
| 2600 | `553a77bea7ecdb678abda555496bca292af9afc7ed0f463724b525edaae3d4de` | 3245321391 | 1 / 0 | 40/40/40/40 | 1 / Shuckle / 5/5/5/5 | The same party-switch path now succeeds; Magikarp is active |
| 2825 | `9afce6ebdb8f8441262ca22c8eaa45afb889a578847d46fd41e2e4cf84c1d057` | 3245321391 | 1 / 67108864 | 40/40/40/40 | 1 / Shuckle / 5/5/5/4 | The replacement's independent Mean Look traps the newly active battler |

The failed and successful attempts are an internal before/after control in one
receipt: the selected bench and party-menu path are the same; the staged
change is removal of the original preventer and clearing of escape prevention.
The replacement is also deliberately allowed to use Mean Look after the
successful priority switch, proving the success was not a missing-input
artifact.

The full manifest does **not** expose
`gDisableStructs[target].battlerPreventingEscape`. Therefore the hidden value
“Murkrow's battler ID” remains source-backed. What the oracle directly observes
is the bit, the rejected switch while Murkrow remains active, the bit clearing
at Murkrow's forced removal, and the immediately successful switch afterward.
Source supplies the causal identity rule: application writes the attacker to
`battlerPreventingEscape`, and switch/faint cleanup clears only traps whose
stored preventer equals the departing battler.

## 2. Nightmare / `MOVE_EFFECT_NIGHTMARE`

[`mechanic-nightmare-haunter-shuckle-off.json`](../tools/battle-lab/mechanic-nightmare-haunter-shuckle-off.json)
uses dossier carrier `FRONTIER_MON_HAUNTER_2` (set 284) with its exact stock
Psychic/Hypnosis/Nightmare/Confuse Ray moves, Relaxed nature, Lum Berry, and
single Levitate ability. Opponent Shuckle has four identical Splash slots.
Seed 1 makes the real Hypnosis hit and gives a four-turn Sleep counter, long
enough for Nightmare application, two end-turn ticks, and natural wake
cleanup.

| Receipt field | SHA-256 / value |
| --- | --- |
| Scenario | `4212ccd2efede44e729b89b5a07357758e5e599756a8837cdd3879352eda5f19` |
| Full manifest, run 1 | `a74e32ccf4b4382466e4da5343bafed5da97d97ac69094d2a33d81ce82a8313e` |
| Full manifest, run 2 | `a74e32ccf4b4382466e4da5343bafed5da97d97ac69094d2a33d81ce82a8313e` |
| Capture grid | frames 0–4925 inclusive, step 25, 198 captures |

`STATUS2_NIGHTMARE` is `1 << 27`, or `134217728`. Shuckle's max HP is 116,
so the source formula `max(1, maxHP / 4)` yields 29.

| Frame | Raw RGB888 framebuffer SHA-256 | RNG | Hypnosis / Nightmare PP | Shuckle HP | Active / party `status1` | Active `status2` | Observed fact |
| ---: | --- | ---: | --- | ---: | --- | ---: | --- |
| 0 | `38dcbb14c81baba91e29f23f78fadc84a16ffdc1bfc5dac3ef5dffbdb5b11c57` | 919694434 | 20 / 15 | 116 | 0 / 0 | 0 | Awake, Nightmare-free initial target |
| 125 | `7e4d89b68b605ad7b4da2205176dfe190d7dc10a692b120c444c2c3a15010f7e` | 983229340 | 19 / 15 | 116 | 4 / 4 | 0 | Real Hypnosis produced four-turn Sleep |
| 1025 | `b9ce920be82447ffd80943b82167503c8864d7e48ead4fff81d5cd7ef744c17d` | 3034451114 | 19 / 14 | 116 | 3 / 3 | 134217728 | Nightmare spent PP and set its volatile bit on the sleeping target |
| 1375 | `df81bb87d878f034ece2dce9b037c2a2a64db4b0ef39f17dfae3622f6265cc0a` | 2682491093 | 19 / 14 | 87 | 2 / 2 | 134217728 | First Nightmare end turn dealt 29 |
| 2375 | `9fd449446ce1e9a2e49e3e980b410ece78845c46a9d30a7e26f5e4a8785d8bc9` | 1636055286 | 19 / 13 | 58 | 1 / 1 | 134217728 | Second Nightmare end turn dealt another 29 |
| 3150 | `ceb77b7c47ec1b643324d305a0d42a96617a03e5d5343986ddac0d57551b8e37` | 1636055286 | 19 / 12 | 58 | 0 / 0 | 0 | Natural wake clears Sleep and Nightmare before another HP tick |
| 3400 | `eac37cb1265f4a6667c89f2df489c615a9b88214eff7c1fb64b143eb42e75843` | 1630250804 | 19 / 12 | 58 | 0 / 0 | 0 | Settled next-request state retains cleanup and HP |

The HP receipt is direct and persistent in both the active battler and party
record: `116 → 87 → 58`, exactly two losses of `floor(116 / 4) = 29`.
Natural waking then synchronizes active and party `status1` to zero, clears
the active Nightmare bit, and prevents a third HP loss.

Hypnosis accuracy and Sleep duration necessarily consume live ROM RNG. The
Nightmare application itself has no local draw; the coarse frame snapshots
around the larger turns are not used to attribute all other RNG movement.
Repeated Nightmare selections while the target already carries the bit spend
PP and exercise the duplicate-failure entry guard, but this receipt does not
claim Substitute coverage.

## Observed-versus-source-only boundary

The committed hermetic fixture pins both scenario hashes, twice-run full
manifest hashes, selected normalized framebuffer hashes, complete party
shape/checksums, strict speeds, PP, HP, active and party `status1`, active
`status2`, party indexes, opponent species changes, RNG snapshots, and the
failed/successful switch consequences.

The public manifest does not expose battle-script PCs, printed string IDs,
individual `Random()` ownership, or `battlerPreventingEscape`. Consequently:

- Mean Look's volatile bit and switch consequences are observed, including
  release exactly when the staged Murkrow leaves; the preventer identity cell
  and comparison are source-only.
- Nightmare's application bit, two quarter-HP ticks, persistent party HP, and
  wake cleanup are observed; reducer ordering and the minimum-one-HP branch
  remain source-backed.
- Duplicate Nightmare is exercised through additional PP spends, but
  Substitute failure and minimum-HP damage are not claimed by this receipt.

No production implementation is treated as evidence here. These receipts
corroborate the pinned pret source ahead of Cluster 3 engine work.
