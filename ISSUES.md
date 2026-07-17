# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #4 — Summary Info page: B-exit fade renders wrong from 2 ticks in

**Symptom:** the B-exit (Info page → draft) fade-out's rendered pixels
diverge severely from ~2 ticks after the B press registers (SSIM trending
toward 0, not a small residual), while the phase/tick bookkeeping itself
settles at the expected tick. Entry fade + settled page are exact
(`summary-info-onix.json` 64/64); only the exit direction is wrong.

**Exact repro** (from the S4 renderer session): trace `2xA, wait 40, 2xA,
wait 60, 2xB, wait N`, dense-capture frames 104-165 — 104-106 match, first
divergence at 107.

**Confirmed:** this does NOT fit the "+1 elapsed" pattern that fixed the
entry fade (`fadeRender.ts`/`core.ts` render dispatch) — do not apply it
blindly. The exit fade needs its own fresh, isolated dense oracle probe
(B-press from a settled Info page, every frame) to re-derive the curve/
phase alignment from pixels before coding.

**Then:** extend `summary-info-onix.json` through the B-exit to the settled
draft screen; add `summary-info-magby.json` (probe MAGBY's own stable
window first — do not assume ONIX's +59..+64 transfers).
