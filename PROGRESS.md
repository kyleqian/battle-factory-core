# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 303 — Bounded S8 postwin increment: **GREEN — Battle 2 opening quote exact**

- **State:** canonical **30031-32031** now reaches FISHERMAN JENSON's held,
  input-ready `"MY POKéMON WILL MAKE YOU DOWNCAST"` quote without dismissing
  it. Prefix-identical traces are **225/225 + 131/131 exact**, predecessor
  decline is **73/73**, Tier-1 is **1086/1086**, and build passes
  (**5.484 MB**).
- **Did:** stored the canonical 30032 guide dismiss edge, reused the shared
  close/walk/warp/camera/room/message machinery, source-selected Fisherman
  gfx + JENSON's Easy Chat quote, and modeled the returning attendant's real
  standard-animation alternation. Fresh RAM pins room/sprite boundaries and
  relative +109/+110 RNG bursts.
- **Next:** resume from held **32031**; freshly bisect the quote-dismiss
  gate, then implement Battle 2's trainer-intro transition toward the first
  action menu. This worker intentionally did not dismiss the quote. Battle
  2+, swap YES, and round completion remain open; S8 stays `[ ]`.
- **Notes:** implementation/traces `e149116`; evidence/docs commit follows.
  Every dynamic frame 30031-30382 is captured, with byte-static anchors
  through 32031. Gate: frame 29660 ready/first accepted press start, stored
  edge 29661; canonical starts 30031/stores 30032. No forbidden asset,
  lookup/table, tick/trace branch, fitting, exclusion, or thinning.

---
## 302 — Supervisor-accepted S8 postwin increment: **GREEN — NO through held guide message**

- **State:** canonical **29601-30031** now reaches the settled/input-ready
  `"Right this way, please!"` message without dismissing it. The committed
  trace is **73/73 exact**, predecessor `-scout-b` is **164/164**, Tier-1 is
  **1083/1083**, and build passes (**5.472 MB**).
- **Did:** stored logical/display swap cursor edges, reproduced the real
  one-VBlank cursor copy, accepted canonical NO at 29632, and printed the
  source guide string through the live field window/font path. Fresh sweeps
  pin early/delayed DOWN/A; a 434-row RAM audit pins unchanged healed state
  and one VBlank LCG call on every tick.
- **Next:** resume from held canonical **30031**; first eligible dismiss is
  29660, but this worker intentionally did not consume it. Dismissal,
  attendant/player walk, warp, Battle 2, battles 3-7, and round completion
  remain open; S8 stays `[ ]`.
- **Notes:** implementation/trace `7c0ebe8`; evidence/docs commit follows.
  True edges: swap input 29272; canonical DOWN 29602 (visible 29603); NO
  29632; text final 29658; message input-ready 29660. Prefix `[0:146]` is
  byte-identical. No forbidden asset/table, tick/trace branch, fitting,
  exclusion, or dynamic thinning. Supervisor independently reviewed the
  logical/display cursor handoff and edge-relative message path, then
  reverified the 73/73 trace, 164/164 predecessor, all 1083 Tier-1 tests,
  and production build.

---
## 301 — Supervisor-accepted S8 postwin increment: **GREEN — GO ON through swap prompt ready**

- **State:** canonical **26009-29601** is extended through the held,
  input-ready swap-offer YES/NO prompt. Adjacent traces are **171/171 +
  164/164 exact**, with every dynamic tick captured; predecessor is
  **216/216 exact**. Tier-1 is **1080/1080** and build passes
  (**5.471 MB**).
- **Did:** stored canonical GO ON/page edges, ported all three source scouting
  strings and swap offer through live field window/font pipelines, separated
  swap text settle/menu-visible/input-ready, and pinned the edge-relative
  five-call GO ON RNG burst under continuing VBlank ownership. Fresh paired
  input sweeps and a compact RAM/task ledger pin readiness.
- **Next:** resume after **29601** with canonical YES at 29602 or NO-path
  selection; this worker intentionally stopped before choosing. Swap UI/
  decline, Battle 2, battles 3-7, and round completion remain open; S8 stays
  `[ ]`.
- **Notes:** implementation `9b747fe`, dense traces `a542eb8`; evidence/docs
  commit follows this entry. True accepted A ticks: menu 26009, scouting
  28074/28476/28874, swap 29272 (text final 29265, menu visible 29268).
  Ground-truth segments `[0:146]` are byte-identical. No forbidden frame
  asset/table, canonical-tick branch, fitting, exclusion, or thinning.
  Supervisor independently reviewed the stored-edge state/RNG/render paths
  and reverified the 171/171 + 164/164 traces, 216/216 predecessor, all
  1080 Tier-1 tests, and production build.
