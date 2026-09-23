"""Extract source palette resources for the explicitly audited live adapter set."""
import hashlib,json,re,struct,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
REF=(ROOT/'reference/pokeemerald').resolve()
ROM=(REF/'pokeemerald.gba').read_bytes()
symbols={}
for line in subprocess.check_output(['arm-none-eabi-nm','-a',str(REF/'pokeemerald.elf')],text=True).splitlines():
    parts=line.split()
    if len(parts)==3:
        try:symbols[parts[2]]=int(parts[0],16)
        except ValueError:pass
def palette(symbol, compressed=True):
    off=symbols[symbol]-0x08000000
    if not compressed:
        data=ROM[off:off+32]
    else:
        assert ROM[off]==0x10
        size=int.from_bytes(ROM[off+1:off+4],'little')
        pos=off+4;data=bytearray()
        while len(data)<size:
            flags=ROM[pos];pos+=1
            for bit in range(7,-1,-1):
                if len(data)>=size:break
                if flags&(1<<bit):
                    a,b=ROM[pos:pos+2];pos+=2
                    length=(a>>4)+3;distance=((a&15)<<8|b)+1
                    for _ in range(length):data.append(data[-distance])
                else:data.append(ROM[pos]);pos+=1
    assert len(data)>=32,(symbol,len(data))
    # LoadSpritePalette always copies one 4bpp row, even for larger assets.
    return list(struct.unpack('<16H',data[:32]))
header=(REF/'include/constants/battle_anim.h').read_text()
tags={name:10000+int(offset) for name,offset in re.findall(r'#define (ANIM_TAG_\w+)\s+\(ANIM_SPRITES_START \+ (\d+)\)',header)}
table=(REF/'src/data/battle_anim.h').read_text().split('const struct CompressedSpritePalette gBattleAnimPaletteTable[] =',1)[1].split('};',1)[0]
resources={name:{'tag':tags[name],'symbol':symbol,'colors':palette(symbol)} for symbol,name in re.findall(r'\{(\w+),\s*(ANIM_TAG_\w+)\}',table)}
script=(REF/'data/battle_anim_scripts.s').read_text()
blocks={};label=None
for line in script.splitlines():
    match=re.match(r'^(\w+)::?$',line)
    if match:label=match[1];blocks[label]=[]
    elif label:blocks[label].append(line.strip())
ids={2,5,11,14,21,23,25,27,29,39,41,44,47,48,67,78,79,92,93,94,95,97,101,103,108,109,122,131,136,147,154,158,163,210,211,223,231,242,246,247,264,280,305,306,320,325,336,337,342,347}
components=json.loads((ROOT/'src/data/gen/battle-animation-components.json').read_text())
plans={}
used=set()
for move in components['moves']:
    if move['id'] not in ids:continue
    loads=[]
    for block in move['blocks']:
        for line in blocks[block]:
            match=re.match(r'loadspritegfx (ANIM_TAG_\w+)$',line)
            if match:loads.append(match[1]);used.add(match[1])
            assert not line.startswith('unloadspritegfx '),move['move']
    plans[str(move['id'])]={'move':move['move'],'loads':loads}
# SmokescreenImpact loads a separate source resource from its task callback.
smoke=(REF/'src/battle_anim_smokescreen.c').read_text()
tag_match=re.search(r'#define TAG_SMOKESCREEN\s+(\w+)',smoke)
assert tag_match
tag=int(tag_match[1],0)
resources['TAG_SMOKESCREEN']={'tag':tag,'symbol':'gSmokescreenImpactPalette','colors':palette('gSmokescreenImpactPalette')}
plans['108']['taskLoads']=['TAG_SMOKESCREEN'];used.add('TAG_SMOKESCREEN')
# The physical batch uses script-owned loads; Steel Wing rotates only faded
# GUST colors. Dynamic Punch intentionally loads four rows before its body.
# Confusion/Psychic rotate only BG faded rows; Night Shade changes sprite
# affine/blend state; Shadow Ball loads its one script-owned OBJ row. None
# of their task callbacks writes or allocates extra OBJ unfaded palettes.
# Rainbow notes allocate three additional tags and write only five faded
# colors per row. The table is ROM source data, never a battle capture.
notes_offset=symbols['gParticlesColorBlendTable']-0x08000000
rainbow=[]
for i in range(4):
    row=struct.unpack_from('<6H',ROM,notes_offset+i*12)
    rainbow.append({'tag':row[0],'colors':list(row[1:])})
assert rainbow[0]['tag']==tags['ANIM_TAG_MUSIC_NOTES']
for move_id in ['47','320']:plans[move_id]['rainbowNotes']=True
# Powder/poison/ring/spore/noise callbacks do not allocate additional OBJ
# palettes or alter unfaded OBJ colors; Hypnosis' color cycle is faded-only.
source_files=['src/battle_anim_poison.c','src/battle_anim_sound_tasks.c','src/battle_anim_effects_1.c','src/battle_anim_effects_2.c','src/battle_anim_ghost.c','src/battle_anim_psychic.c','src/battle_anim_effects_3.c','include/constants/battle_anim.h','src/data/battle_anim.h','data/battle_anim_scripts.s','src/battle_anim_smokescreen.c','src/sprite.c','src/battle_anim_mons.c','src/link_rfu_3.c']
out={
 'schema':'live-animation-palette-resources/v1',
 'sourceSha256':{name:hashlib.sha256((REF/name).read_bytes()).hexdigest() for name in source_files},
 'rainbowNotes':rainbow,'plans':plans,'resources':{name:resources[name] for name in sorted(used)},
 'bentSpoonTag':tags['ANIM_TAG_BENT_SPOON'],
 'initial':{
  'wirelessTag':0xD432,'healthboxTag':0xD6FF,'healthbarTag':0xD704,
  'wireless':palette('sWirelessLinkIconPalette',False),
  'healthbox':palette('gBattleInterface_BallStatusBarPal',False),
  'healthbar':palette('gBattleInterface_BallDisplayPal',False),
 }
}
path=ROOT/'src/data/gen/live-animation-palette-resources.json'
path.write_text(json.dumps(out,separators=(',',':'))+'\n')
print('extracted',len(plans),'plans',len(out['resources']),'palette resources')
