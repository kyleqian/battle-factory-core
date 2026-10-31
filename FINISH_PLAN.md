# Finish plan

The plan Kyle approved on 2026-10-26 lives where the agents read it:
[workspace/docs/finish-plan.md](workspace/docs/finish-plan.md). The run
handoff is [workspace/docs/cax31-session-handoff.md](workspace/docs/cax31-session-handoff.md).

Short version: crashes first (Scene ON soaks with drawing on, in-app
containment), then every animation plays (an "approximate" claim class
replaces the blank hold), then production (bundle, title screen, touch, save,
deploy) with cleanup interleaved; timing residuals last. About 10–13 daily
runs.

Status 2026-10-31: the crash and animation phases are met after five runs
(blank holds 207 → 0, send-outs and Castform drawn, nightly crash checks
clean). Kyle re-aimed the runs at production + cleanup, alternating; the
remaining send-out residuals are long-tail timing work.

Later on 2026-10-31 Kyle split the product: this repo is the **game core
library** (`@pokebench/factory`, mount / event / save API first, then
**audio (S11), back in scope**, then cleanup and bundle hygiene). The website
— login, saved streaks, hosting on Cloudflare Workers + D1 — is a separate
repo, `~/Developer/pokebench/factory-web`, built from the Mac.
