# Species audit 9 (d): Meteor Mash, FLYGON player-side target (opponent METANG attacker)

Audit 9 residual: 289,856 px = documented TP rows 196..211 (277,552) + star pixels on ages 49..189 (5-159 px/row).

Cause (RAM / words first): the first mini twinkling star sits 8 px apart (ROM y2 -5 vs live +3, `Random2() & 7`), i.e. the
derived fixture's `presentationRngActivation` (prep22Probe.py `rng2Series[236]` stepped back once = 3055620189) is not the
activation state of the RGB probe run. `meteorMashRng2OffsetScan.ts` (offline, retained RGB frames, ages 48..100, offsets
-600..600) gives 0 px only at -4 (next best 3,581 px); the -4 value is 2566245609 = the GOLBAT sibling fixture's value (same
scenario frames 235.., the Random2 stream is species-independent). The prep22Probe FLYGON runs (r1 == r2) carry 4 extra
Random2 steps before frame 236 relative to the RGB probe: a fixture-derivation artifact, not a production defect.

With the corrected activation (`flygon-...-rng-4.json`): d4aTimingCheck 214 rows, 2 fresh mGBA runs, digests identical,
277,552 px on ages 196..211 only (the documented other-phase rows), no violations (`receipt-rng-4.json`). No production change,
no decline.

Reproduce: `node --experimental-strip-types tools/integration/d4aTimingCheck.ts /tmp/r.json tools/integration/fixtures/s10a-part0/meteor-mash-flygon/flygon-meteor-mash-opponent-metang-player-onix-rng-4.json`;
scan: `FRESH=1 POKEBENCH_LIVE_EVIDENCE_DIR=/tmp/ev OUT_DIR=/tmp/evr npx vite-node tools/integration/speciesAuditDense.ts <derived fixture>` then
`node --experimental-strip-types tools/integration/meteorMashRng2OffsetScan.ts <derived fixture> /tmp/ev/<stem>-run0 -600 600 48 100`.
