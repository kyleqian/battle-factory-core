# Open questions

## Continue a challenge across game updates with a between-battles save? (2026-11-12)

**Today:** a challenge is a seed plus your button presses. Resuming replays the presses from the very start, and only the exact game build they were played on replays them correctly. So the site keeps every shipped build in R2 and loads a challenge's own build ("finish on the version you started on"; factory-web `scripts/engines.mjs`). It works, but it is a versioning system to maintain, and an old challenge keeps the old bugs until it ends.

**Proposal:** a checkpoint between battles, taken at the "Nth match is next" prompt, where the ROM itself lets you save (REST). It holds the team, streak, battle number and RNG state.
- **How:** at each battle end the server replays that battle on the then-current build and stores the checkpoint. It never trusts the browser, and it never needs that build again.
- **After an update:** the challenge continues on the new build from the last checkpoint. A battle in progress during an update restarts from its beginning.
- **Also gives:** faster reloads, and a cheat check per battle.

**Cost:**
- **Box:** a checkpoint format that stays stable across builds; mount / replay starting from a checkpoint; a proof that starting from a checkpoint equals playing straight through.
- **Site:** about one session, to store checkpoints, resume from the newest one and check each battle.
- **Afterwards:** delete the build archive.

**Waiting on:** Kyle — whether and when to queue it.
