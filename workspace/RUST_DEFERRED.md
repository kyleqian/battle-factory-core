# Rust-lane deferred questions

Same contract as `DEFERRED.md`, scoped to the Rust rewrite: a lean
`## D<number> — OPEN:` entry here records a decision the rust supervisor
cannot safely make (mission scope, boundary design that locks in a public
surface, anything that would edit TypeScript outside the M2 adapter
allowance). An open entry blocks the next `./run-supervisor.sh --lane rust`
session by default. A bounded unattended schedule may preserve it and continue
only independent reversible work until the user resolves it. Main-program
deferrals live in `DEFERRED.md` and animation
deferrals in `ANIMATION_DEFERRED.md`; none of the three block each other's
lanes.

(no open entries)
