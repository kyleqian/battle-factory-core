# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1175 — [MAIN worker, 2026-08-11] **#55 MPlay dispatcher source-closed**

- **State:** command decode/running-status/jump-table dispatch is source-exact
  for **218/218** commands and **108/108** one-pass rows. Complete MPlay remains
  **5 exact / 108 null**; #55 and `runFactoryConstructionClock` stay unwired.
- **Did:** joined exact execution, bounded command reads, callback tables,
  callback-family census, and note census: **99 waits / 82 notes / 37 table
  callbacks**, six routes at **63–93 cycles**, **17,066** cycles total. Pinned
  **4,069** Thumb halfwords / **792** refills / **533** EWRAM words / **99**
  ROM literals / **317** GamePak bytes; source/state/target mutations fail closed.
- **Next:** source-close one bounded post-selection `ply_note` body subroute.
  Preserve nulls for keysplit, complete notes, post-callback glue, all complete
  one-pass MPlay totals, and the construction clock.
- **Notes:** implementation commit `8f72b6a6`; focused **15/15**, smoke
  **375/375**, typecheck, full **972 files / 9,423 passed / 1 skipped**, and
  build **651 modules** are green. No oracle capture, duration fit, pointer
  identity, unsupported barrier, gameplay/pixel/Rust/#56 change.

## 1174 — [supervisor, 2026-08-11] **`ply_note` inline prefix verified**

- **State:** all **82/82** observed note-selector prefixes are source-exact
  (**57 inline / 25 rhythm / 0 keysplit**). Complete MPlay remains **5 exact /
  108 null**; #55 stays unwired and LUKAS remains **8/50**.
- **Did:** independently regenerated the expanded address-free receipt **5/5**
  and reviewed its source, parameter, inline-tone, and retained-track-tone
  fail-closed checks. Inline costs are **3×108**, **41×129**, and **13×146**
  cycles; all post-selection bodies remain null.
- **Next:** source-close one bounded observed post-selection note-body route or
  the command decode/jump-table dispatcher. Preserve nulls for keysplit,
  complete note callbacks, and all complete one-pass MPlay totals.
- **Notes:** supervisor full `npm test` **971 files / 9,419 passed / 1
  skipped**, build **651 modules**. Both lane branches are contained; no
  unsupported barrier or gameplay/pixel/Rust change.

## 1173 — [MAIN worker, 2026-08-11] **#55 `ply_note` inline prefix source-closed**

- **State:** all **82/82** observed note-selector prefixes are source-exact
  (**57 inline / 25 rhythm / 0 keysplit**). Complete MPlay remains **5 exact /
  108 null**; #55 and `runFactoryConstructionClock` stay unwired.
- **Did:** the committed address-free census splits inline into **3×108**
  cycle zero-parameter, **41×129** key-only, and **13×146** key+velocity
  callbacks, all reaching the same tone-selection join. Source/ELF and
  malformed selector/state mutations fail closed.
- **Next:** source-close one bounded post-selection note-body subroute or the
  command decode/jump-table dispatcher. Preserve nulls for keysplit, all
  complete note callbacks, and all complete one-pass MPlay totals.
- **Notes:** focused **5/5**, smoke **375/375**, typecheck, full **971 files /
  9,419 passed / 1 skipped**, and build **651 modules** are green. Known
  components span **456–2160** cycles (**84** totals). No new oracle capture,
  duration fit, pointer identity, unsupported barrier, construction-clock
  wiring, gameplay, renderer, pixel, #56, or Rust change.
