// pfr192: residuals of the keyed player faint-replacement send-in clock vs the ROM (pfr185 fixtures; frames counted from the SEND OUT confirm).
//   part "model":  playerFaintReplacementSendOutTiming() for the 11 pfr185 cases x 2 scenes + MAGBY x 2 vs the ROM next print / action prompt
//   part "routes": real generated-rental routes (kernel + projectBattleResolutionCommands + orchestrator, replacement answered DOWN/A/A):
//                  measured turn-end start / blank start / first action-menu frame vs the same model fed with that replacement's species/name/nature
//   node --experimental-strip-types --no-warnings tools/integration/pfr192Prod.ts <out.json> [seed,seed,...]
import { readFileSync, writeFileSync } from "node:fs";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { playerFaintReplacementSendOutTimingOfSegment } from "../../src/engine/battleResolutionPresentationRender.ts";
import { playerFaintReplacementSendOutTiming } from "../../src/engine/switchInTail.ts";
import { PARTY_SENDOUT_ACTION_MENU_START, PARTY_SENDOUT_BLANK_MESSAGE_START } from "../../src/engine/partySelect.ts";
import { sceneOffPlayerForcedSwitchInDuration, sceneOnPlayerForcedSwitchInDuration } from "../../src/engine/switchInTail.ts";

const [outPath, seedArg] = process.argv.slice(2);
const dir = "tools/integration/fixtures/pfr185";
const rom = [...JSON.parse(readFileSync(`${dir}/rom-rows-r1.json`, "utf8")), ...JSON.parse(readFileSync(`${dir}/magby-rom-rows-r1.json`, "utf8"))] as any[];
const edge = new Map([...JSON.parse(readFileSync(`${dir}/confirm-edge.json`, "utf8")), ...JSON.parse(readFileSync(`${dir}/magby-confirm-edge.json`, "utf8"))].map((e: any) => [e.key, e]));

const model: any[] = [];
let promptRes0 = 0; let nextRes0 = 0; let nextResPlus1 = 0;
for (const r of rom) {
  const e = edge.get(`${r.id}-${r.scene}`)!;
  const species = r.case.species as number; const nature = (r.case.nature ?? 6) as number;
  const nameLength = e.ballFromConfirm - 91;
  const t = playerFaintReplacementSendOutTiming({ species, nameLength, personality: nature, sceneOn: r.scene === "on", followingFrames: 14, goTextChars: 10 });
  const firstMenu = t.readyAt + 14;
  const baseBlank = PARTY_SENDOUT_BLANK_MESSAGE_START; const baseMenu = PARTY_SENDOUT_ACTION_MENU_START + 14;
  const row = {
    id: r.id, scene: r.scene, species, nature, ballFromConfirm: e.ballFromConfirm,
    romNextPrint: e.nextTxtFromConfirm, romPrompt: e.promptFromConfirm,
    baseBlankStart: baseBlank, baseFirstMenu: baseMenu, baseMinusRomPrompt: baseMenu - e.promptFromConfirm, baseMinusRomNext: baseBlank - e.nextTxtFromConfirm,
    keyedBlankStart: t.blankStart, keyedFirstMenu: firstMenu, keyedMinusRomPrompt: firstMenu - e.promptFromConfirm, keyedBlankMinusRomNext: t.blankStart - e.nextTxtFromConfirm,
    ballShift: t.ballShift, releaseExtra: t.releaseExtra, readyAt: t.readyAt,
  };
  if (row.keyedMinusRomPrompt === 0) promptRes0 += 1;
  if (row.keyedBlankMinusRomNext === 0) nextRes0 += 1;
  if (row.keyedBlankMinusRomNext === 1) nextResPlus1 += 1;
  model.push(row);
  const f = (n: number) => (n >= 0 ? "+" : "") + n;
  console.log(`${r.id.padEnd(14)} ${r.scene.padEnd(3)} ROM next/prompt ${String(e.nextTxtFromConfirm).padStart(3)}/${String(e.promptFromConfirm).padStart(3)}  base ${baseBlank}/${baseMenu} (${f(baseBlank - e.nextTxtFromConfirm)}/${f(baseMenu - e.promptFromConfirm)})  keyed ${t.blankStart}/${firstMenu} (${f(t.blankStart - e.nextTxtFromConfirm)}/${f(firstMenu - e.promptFromConfirm)})`);
}
console.log(`${model.length} rows; keyed prompt residual 0: ${promptRes0}; keyed blank start == ROM next print + 1 (render lag): ${nextResPlus1}; ==0: ${nextRes0}`);

const routes: any[] = [];
if (seedArg) {
  for (const scene of ["off", "on"] as const) {
    for (const seed of seedArg.split(",").map(Number)) {
      let fainted = false; let last = ""; let confirm: number | null = null;
      let timing: ReturnType<typeof playerFaintReplacementSendOutTimingOfSegment> = null; let expected: any = null;
      const phases: Record<string, number> = {};
      try {
        generatedCommandAnimationReplay(seed, scene, Array(10).fill(0) as never, 0, true, true, (state, frame) => {
          const r = state.battleResolutionPresentation; const bc = state.battleCommandPresentation;
          if (r && r.lifecycle.phase === "presenting") {
            const c: any = r.segments[r.segmentIndex]!.commands[r.commandIndex];
            if (c?.type === "faint" && c.battler === 0) fainted = true;
          }
          if (!fainted) return;
          const key = r ? `${r.lifecycle.phase}:${r.segments[r.segmentIndex]!.commands[r.commandIndex]?.type}` : `command:${bc?.lifecycle.phase}`;
          if (key === last) return;
          last = key;
          if (r?.lifecycle.phase === "presenting-switch-in" && confirm === null) {
            confirm = frame;
            const seg = r.segments[r.segmentIndex]!;
            timing = playerFaintReplacementSendOutTimingOfSegment(seg);
            const sw: any = seg.commands.find((c) => c.type === "switch-in");
            const sceneOn = scene === "on";
            const D = sceneOn ? sceneOnPlayerForcedSwitchInDuration(sw.incoming.species, sw.incoming.personality ?? 0) : sceneOffPlayerForcedSwitchInDuration(sw.incoming.species);
            expected = { species: sw.incoming.species, name: sw.incoming.name, personality: sw.incoming.personality ?? 0, prompt: 91 + sw.incoming.name.length + D + 17, trailing: seg.commands.slice(seg.commands.indexOf(sw) + 1).map((c) => c.type) };
          }
          if (confirm !== null) phases[key] ??= frame - confirm;
          if (bc?.lifecycle.phase === "action-menu") throw new Error("done");
        });
      } catch { /* done / stall / battle end */ }
      if (confirm === null) continue;
      const menu = phases["command:action-menu"] ?? null;
      const turnEnd = phases["presenting:turn-end"] ?? null;
      const row = { scene, seed, ...expected, readyAt: timing?.readyAt ?? null, blankStart: timing?.blankStart ?? null, measuredTurnEndStart: turnEnd, measuredFirstMenu: menu,
        menuMinusExpectedPrompt: menu === null ? null : menu - expected.prompt, phases };
      routes.push(row);
      console.log(scene, seed, expected.name, `trailing=${expected.trailing.join(",")}`, `expectedPrompt ${expected.prompt} measuredMenu ${menu} (res ${row.menuMinusExpectedPrompt})`);
    }
  }
}
writeFileSync(outPath!, JSON.stringify({ model, routes }, null, 1) + "\n");
