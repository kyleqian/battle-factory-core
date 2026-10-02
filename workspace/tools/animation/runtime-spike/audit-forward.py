#!/usr/bin/env python3
"""Source-graph demand indicators; not certified implementation/branch coverage."""
import collections
import hashlib
import json
from pathlib import Path
import re

graph_path = Path('src/data/gen/battle-animation-components.json')
script_path = Path('reference/pokeemerald/data/battle_anim_scripts.s')
graph = json.loads(graph_path.read_text())
moves = [move for move in graph['moves'] if move['tier'] == 'outsideFactory']
blocks = {}
current = None
for line in script_path.read_text().splitlines():
    match = re.match(r'^(\w+):', line)
    if match:
        current = match[1]
        blocks[current] = []
    elif current is not None:
        text = line.strip().split('@')[0].strip()
        if text and not text.startswith('.'):
            blocks[current].append(text.split()[0])

consumers = collections.defaultdict(list)
for move in moves:
    opcodes = {op for block in move['blocks'] for op in blocks.get(block, [])}
    for opcode in opcodes:
        consumers[opcode].append(move['move'])

opcodes = ['loadspritegfx', 'createsprite', 'createvisualtask', 'monbg',
           'setalpha', 'create_basic_hitsplat_sprite', 'choosetwoturnanim', 'jumpreteq']
print(json.dumps(dict(
    scope='Each opcode once per outsideFactory move across its entire source graph; direct createsprite excludes macros. No accepted-branch or ready-to-reuse claim.',
    hashes={str(path): hashlib.sha256(path.read_bytes()).hexdigest() for path in (graph_path, script_path)},
    moves=len(moves),
    requirements={op: dict(count=len(consumers[op]), moves=consumers[op]) for op in opcodes},
), indent=2))
