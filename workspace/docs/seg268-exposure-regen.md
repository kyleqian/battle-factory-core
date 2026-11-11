# seg268: seg127 census exposure regenerated on the current kernel

`tools/integration/fixtures/seg127/exposure.json` (docs/seg127-status-se-gate.md §1b) was computed on the old kernel `cfe4e26ca`; abl261 / dmg264 /
aiv266 changed census battles, so sag130 lost 4 anchor classes. seg268 restores the generator deleted in cln237 (`4f6fa87e4^`:
`tools/integration/seg127Exposure.ts`, `seg127ExposureSummary.py`; no edits beyond a one-line header each, both still run against the current
tree) and regenerates the file: Scene ON, census seeds 0..999 (battle i = seed i, streak i * 11 % 49), 7 shards, no src/ change.

```sh
node --experimental-strip-types --no-warnings tools/integration/seg127Exposure.ts --seeds=A..B --out=<dir>/e_A.jsonl   # shards of 150 seeds, 2 at a time (~5 min)
python3 tools/integration/seg127ExposureSummary.py <dir> tools/integration/fixtures/seg127/exposure.json tools/integration/fixtures/seg127/rule.json
```

Seed 796 hits the 200,000-frame budget (known since abl261, `docs/abl261-ability-damage.md`; it also did before, seed 434 now finishes); its 12 receipts
so far are kept. 999 / 1000 battles end terminal. 0 unclassified.

| | old (cfe4e26ca) | new |
| --- | --- | --- |
| receipts | 8080 | 8023 |
| by class: turn-start / end-turn / status-move | 4629 / 1298 / 1529 | 4566 / 1295 / 1532 |
| hit-secondary / contact-ability / cute-charm | 373 / 91 / 5 | 382 / 91 / 8 |
| yawn / thrash-fatigue / synchronize | 84 / 51 / 20 | 80 / 48 / 21 |
| open receipts (`openReceipts`) | 301 | 284 |
| gated receipts / gate frames | 72 / 729 | 72 / 745 |

## Consumers
- `seg127StatusSeGate.test.ts`: re-pinned receipts 8080 -> 8023 and frames 729 -> 745 (gated stays 72), comment names seg268.
- `sgs134SeGateOtherRequests.test.ts`, `inv142StatusAnimationInvisible.test.ts`: pass unchanged (they read their own fixtures, `sgs134/exposure.json`).
- `sag130StatusSeGate.test.ts`: SEEDS re-anchored to the first projected carrier per class
  `[3, 26, 27, 103, 209, 230, 294, 296, 446, 468, 553, 664, 705, 802, 931, 933]`; 189 anchored, 20 gated (171 gate frames), 9 unanchored. The
  production gate equals the projection on every open receipt (no engine disagreement). Restored to the required list:
  hit-secondary|BRN|player (553), hit-secondary|PSN|opponent (931), yawn|SLP|player (230); newly carried too: contact-ability|PRZ|player (933),
  hit-secondary|BRN|opponent (103). **Named gap, kept:** yawn|SLP|opponent has no gated carrier in 0..999 on the current kernel (5 open receipts,
  all gate 0), so it stays out of the required list; its ROM receipts remain in the rule test.
- The abl261 / dmg264 / aiv266 re-stage comments in sag130 are replaced by the seg268 note.

Evidence: `.integration/evidence/seg268/` (ignored): shard jsonl, `exposure-old.json`, `exposure-new.json`.
