#!/usr/bin/env bash
set -euo pipefail

command -v rg >/dev/null 2>&1 || {
  echo "census-next-command-handoffs: rg (ripgrep) is required; without it every count silently reads 0" >&2
  exit 2
}

cd "$(dirname "$0")/.."

type_count=0
field_rows=""
for n in {1..13}; do
  file="src/engine/turn$n""ResolutionAdapter.ts"
  turn_name="Turn$n"
  block="$(rg -U --pcre2 -o "(?s)export type $turn_name""CompletedResolutionNextCommandHandoff = Readonly<\\{.*?\\n\\}>;" "$file" || true)"
  fields="$(printf '%s\n' "$block" | rg -c '^  [A-Za-z][A-Za-z0-9]*:' || true)"
  if [[ -n "$block" ]]; then
    type_count=$((type_count + 1))
  fi
  field_rows="$field_rows $n:$fields"
done

state_fields="$(awk '
  /^export interface BattleSceneState/ { inside = 1 }
  inside && /^}/ { exit }
  inside { print }
' src/engine/battleScene.ts | rg -c '^[[:space:]]{2}turn(1[0-3]|[1-9])NextCommandHandoff[?]?:' || true)"

initial_fields="$(awk '
  /^export const INITIAL_BATTLE_SCENE_STATE/ { inside = 1 }
  inside && /^};/ { exit }
  inside { print }
' src/engine/battleScene.ts | rg -c '^[[:space:]]{2}turn(1[0-3]|[1-9])NextCommandHandoff:' || true)"

copy_fields="$(awk '
  /^export function advanceBattleScene/ { inside = 1 }
  inside && /^}/ { exit }
  inside { print }
' src/engine/battleScene.ts | rg -c '^[[:space:]]{4}turn(1[0-3]|[1-9])NextCommandHandoff:' || true)"

fight_params="$(rg -n -A 30 '^function drawFightSubmenuWindow\(' src/engine/battleScene.ts | rg -c 'turn(1[0-3]|[1-9])NextCommandHandoff:' || true)"
pp_params="$(rg -n -A 30 '^export function currentPPForActiveMon\(' src/engine/battleMenu.ts | rg -c 'turn(1[0-3]|[1-9])NextCommandHandoff:' || true)"
state_literal_assignments="$( (rg -n 'turn(1[0-3]|[1-9])NextCommandHandoff:' src tests || true) | wc -l | tr -d ' ')"

printf 'completed-handoff type declarations: %s\n' "$type_count"
printf 'top-level fields by handoff:%s\n' "$field_rows"
printf 'BattleSceneState handoff fields: %s\n' "$state_fields"
printf 'initial-state handoff entries: %s\n' "$initial_fields"
printf 'advance-copy handoff entries: %s\n' "$copy_fields"
printf 'drawFightSubmenuWindow handoff parameters: %s\n' "$fight_params"
printf 'currentPPForActiveMon handoff parameters: %s\n' "$pp_params"
printf 'src/tests handoff literal assignments: %s\n' "$state_literal_assignments"
