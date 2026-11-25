import sys
p='src/engine/battleResolutionPresentation.ts'
s=open(p).read()
def rep(a,b):
    global s
    assert a in s, a
    s=s.replace(a,b)
mode=sys.argv[1]
if 'L' in mode: rep('export const PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS = 3;','export const PRE_MOVE_STATUS_ANIMATION_LEAD_ROWS = 2;')
if 'H' in mode:
    rep('function usedMovePrintLeadU(state: BattleResolutionPresentationState, handoff: BattleResolutionConfirmHandoff): number | null {','function usedMovePrintLeadU(state: BattleResolutionPresentationState, handoff: BattleResolutionConfirmHandoff, forHold = false): number | null {')
    rep('const head = sceneOff && OFF_HEAD_PRINT_LABELS','const head = (sceneOff || forHold) && OFF_HEAD_PRINT_LABELS')
    rep('const u = usedMovePrintLeadU(state, handoff);\n  return u === null ? 0 : u - 2;','const u = usedMovePrintLeadU(state, handoff, true);\n  return u === null ? 0 : u - 2;')
if 'D' in mode:
    rep('return payload.messageId === "STRINGID_USEDMOVE" || payload.messageId === SELF_CONFUSION_HIT_MESSAGE_ID ? PRE_MOVE_CONFUSION_TO_USED_PRINT_ROWS : 0;','return payload.messageId === "STRINGID_USEDMOVE" ? PRE_MOVE_CONFUSION_TO_USED_PRINT_ROWS : payload.messageId === SELF_CONFUSION_HIT_MESSAGE_ID ? PRE_MOVE_CONFUSION_TO_USED_PRINT_ROWS - 1 : 0;')
open(p,'w').write(s)
