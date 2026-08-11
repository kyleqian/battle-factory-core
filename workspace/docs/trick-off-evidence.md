# Trick / `B_SCR_OP_TRYSWAPITEMS` evidence

This SIDE-lane checkpoint contains only source facts, an OFF-profile oracle
receipt, and hermetic fixture tests. It changes no engine, controller, or
presentation code.

`tryswapitems` is opcode `0xD2`: one opcode byte plus a four-byte
little-endian relocation pointer. Every ordinary rejection assigns that
pointer at `PC + 1`; success advances five bytes. `Cmd_tryswapitems` has no
local `Random()` call. Its guards, in source order, reject Trainer Hill;
an opponent attacker in a regular battle; a knocked-off record in a regular
battle; two empty items; either Enigma Berry; either Mail; and target Sticky
Hold. Sticky Hold instead jumps to `BattleScript_StickyHoldActivates`, writes
the target ability to `gLastUsedAbility`, and records it through
`RecordAbilityBattle`. The source script prints the ineffective-ability
message then goes to MoveEnd; the manifest cannot expose that PC or message
selection, so it is not claimed as an oracle observation.

On success the command saves the target item in attacker-owned
`changedItems`, temporarily clears the attacker active item, assigns the old
attacker item to the target, emits two `REQUEST_HELDITEM_BATTLE` writes, and
clears both two-byte Choice-lock entries. `MOVEEND_CHANGED_ITEMS` restores
the nonempty bookkeeping slot to the attacker active battler and clears the
slot. Player and opponent controller handlers persist those emitted held-item
writes to the corresponding party record. Later move admission and move-end
item consumers read `gBattleMons[].item`; this checkpoint does not claim a
specific later consumer fired.

`EFFECT_TRICK` is move 271 (Psychic, PP 10, selected target, priority 0).
Its script orders `attackcanceler → attackstring → ppreduce → substitute
guard → accuracycheck → tryswapitems`; accordingly PP has already been spent
before any of the opcode's failures. Success then performs its skipped-OFF
animation command sequence, prints the switched-items message, prints an
item-swap table entry, and reaches MoveEnd.

The receipt uses exact source carrier `FRONTIER_MON_FURRET_2` (set 304), a
Level-50-eligible Choice Band Furret with Trick / Frustration / Shadow Ball /
Follow Me, against a complete Chansey party record holding Leftovers. Both
full OFF manifests are byte-identical, SHA-256
`165501dd…ce1adf37`; the scenario SHA-256 is `178827be…e9ac0cb85`. Frames
600–800 are captured every five frames. Frame 600 observes Trick current
(`271`) after PP `10→9`; its deliberately observable controller seam has
Furret active item `0` while the persisted party item is already `200`.
By frame 740 both active and party records show Furret Leftovers (`200`) and
Chansey Choice Band (`186`), with all six party checksums valid. The public
receipt also pins HP, PP, current move, public RNG, and framebuffer hashes in
the fixture; RNG changes after frame 740 belong to Chansey's later Tackle,
not a local draw inside `Cmd_tryswapitems`.

The receipt intentionally does not stage any failure guard or a switch. It
proves persistence in the current active party records; the specific guard
paths, script-PC/ability-message details, Choice bookkeeping, and any later
item consumer remain source-pinned rather than inferred.
