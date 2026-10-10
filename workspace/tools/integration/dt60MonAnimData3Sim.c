// dt60: run every pokemon_animation.c send-out animation (sMonAnimFunctions) on a host build of the SOURCE and print the sprite's
// data[3] when the animation hands off (callback becomes WaitAnimEnd / SpriteCallbackDummy). Built and run by dt60MonAnimData3.py.
// The sprite starts as Task_HandleMonAnimation leaves it before the first callback (pokemon_animation.c:916-929): data[0] = 0,
// data[1] = sDontFlip = TRUE, data[2..7] = 0, sIsSummaryAnim = FALSE. Only the sprite-engine / palette / task externals the
// animations call are stubbed (they write matrices, palettes or tasks, never sprite->data); trig.c is the source's own.
#include <stdio.h>
#include <string.h>
#include "../../reference/pokeemerald/src/pokemon_animation.c"
#include "../../reference/pokeemerald/src/trig.c"

struct Task gTasks[NUM_TASKS];
struct OamMatrix gOamMatrices[OAM_MATRIX_COUNT];
u16 gBattlerPartyIndexes[MAX_BATTLERS_COUNT];
struct Pokemon gPlayerParty[PARTY_SIZE];
void BlendPalette(u16 palOffset, u16 numEntries, u8 coeff, u16 blendColor) { (void)palOffset; (void)numEntries; (void)coeff; (void)blendColor; }
void CalcCenterToCornerVec(struct Sprite *sprite, u8 shape, u8 size, u8 affineMode) { (void)sprite; (void)shape; (void)size; (void)affineMode; }
u8 CreateTask(TaskFunc func, u8 priority) { (void)func; (void)priority; return 0; }
void DestroyTask(u8 taskId) { (void)taskId; }
void FreeOamMatrix(u8 matrixNum) { (void)matrixNum; }
u8 GetNature(struct Pokemon *mon) { (void)mon; return 0; }
void InitSpriteAffineAnim(struct Sprite *sprite) { (void)sprite; }
void ObjAffineSet(struct ObjAffineSrcData *src, void *dest, s32 count, s32 offset) { (void)src; (void)dest; (void)count; (void)offset; }
void SpriteCallbackDummy(struct Sprite *sprite) { (void)sprite; }
void StartSpriteAffineAnim(struct Sprite *sprite, u8 animNum) { (void)sprite; (void)animNum; }

int main(void)
{
    int id;
    for (id = 0; id < (int)ARRAY_COUNT(sMonAnimFunctions); id++)
    {
        struct Sprite sprite;
        int frames = 0;
        memset(&sprite, 0, sizeof(sprite));
        sprite.sDontFlip = TRUE;
        sIsSummaryAnim = FALSE;
        sprite.callback = sMonAnimFunctions[id];
        while (sprite.callback != WaitAnimEnd && sprite.callback != SpriteCallbackDummy && frames < 100000)
        {
            sprite.callback(&sprite);
            frames++;
        }
        printf("%d %d %d\n", id, sprite.data[3], frames);
    }
    return 0;
}
