# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 341 — S8 OFF player-origin swap quit: **GREEN — 233/233 exact**

- **State:** one reusable phase-relative quit interaction now covers player
  picker B and CANCEL, prompt opening/input, default-YES keep-party exit, and
  NO/B transition-in return. Four dense OFF windows are zero diff.
- **Did:** exposed the source's four player actions, wired CANCEL to the same
  quit callback as B, and added transition-out, prompt, no-picture exit/return,
  field handoff, and fresh picker input gates. Tier-1 pins rejected/accepted
  edges, TRUE result semantics, no party/rental mutation, and both returns.
- **Next:** implement the remaining unique swap UI with short staged windows:
  SUMMARY return, enemy `PKMN FOR SWAP`, enemy-origin quit chrome, then
  duplicate-species rejection. Do not claim enemy quit from this player proof.
- **Notes:** quit YES **31/31**, NO **67/67**, B **67/67**, CANCEL+YES
  **68/68**; Tier-1 **1250/1250**, build **5.667 MB**. Gate 2 and S8 remain
  open; no absolute tick lookup, framebuffer asset, or Battle-2 continuation.

---
## 340 — S8 OFF seventh-win terminal continuation: **GREEN — 4424/4424 exact**

- **State:** the staged seventh-win route is gaplessly exact through exchange,
  party/status restore at +3549, save-SE wait, record menu creation at +4422,
  and first accepted default-NO input at +4424. Player-origin swap quit
  evidence now pins its prompt/YES/NO/B boundaries without a Battle-2 replay.
- **Did:** added the phase-relative exchange/restore continuation and reused one
  shared record prompt/menu reducer and renderer for LOSS and round-won.
  Tier-1 pins early-gate rejection, restore/clear, menu creation/visibility/
  input, and immutable round rules, RNG, battle index, parties, and schedule.
  ICE PUNCH's complete inward spiral is now **73/73 exact**.
- **Next:** implement the reusable player-origin quit presentation from the
  staged OFF fixture (prompt, YES exit, NO/B return). Gate 2 also retains
  SUMMARY return, enemy `PKMN FOR SWAP`, enemy quit chrome, and
  duplicate-species rejection. Animation continues at ICE frame 2412.
- **Notes:** seventh-win **2513/2513 + 1911/1911**, LOSS **210/210 + 414/414**.
  Merged Tier-1 **1245/1245**, build **5.665 MB**; ICE **73/73**, FIRE PUNCH
  **225/225**. No deferred questions. No absolute tick, framebuffer/screenshot
  asset, Battles 2–7 replay, YES recording/save branch, repeat challenge, or
  Stage 8 completion claim.

---
## 339 — S8 OFF seventh-win roundWon through fanfare: **GREEN — 2513/2513 exact**

- **State:** the staged seventh-win route is exact from its `CB2_LoadMap`
  handoff through congratulations, the BP award, `MSGBOX_GETPOINTS`, and the
  complete points-fanfare wait at +2513. A source audit confirms four
  swap-YES interaction families remain beyond the accepted canonical route.
- **Did:** connected generic `roundCompleted` to a phase-relative `roundWon`
  terminal adapter and live lobby renderer. Stored gates are +300/+1100/+2200;
  displayed BP changes 0→3 at +2201 and the 312-frame fanfare reaches zero at
  +2513 without controller, RNG, battle-index, party, or opponent mutation.
  ICE PUNCH now extends through its inward crystal spiral at **63/63 exact**.
- **Next:** continue only the source-relative seventh-win remainder at +2514:
  exchange message through party/status restore +3549, then reuse the shared
  record-question/menu machinery through +4424. Swap still needs SUMMARY
  return, quit flows, enemy `PKMN FOR SWAP`, and duplicate-species rejection;
  use staged short windows, not a Battle-2 replay.
- **Notes:** seventh-win **2513/2513**, LOSS **210/210 + 414/414**, Tier-1
  merged **1242/1242**, build **5.663 MB**; ICE **63/63**, FIRE PUNCH
  **225/225**. No deferred questions. No absolute tick, framebuffer asset,
  screenshot lookup, canonical Battle-2 extension, or premature UI claim.
