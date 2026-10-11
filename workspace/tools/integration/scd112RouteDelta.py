#!/usr/bin/env python3
"""scd112 (S10A, ISSUES #166 slice d): base vs final production route renders (scd112RouteRender.ts output).

Per route: frame count / presented frames / per-frame (frame, command key, type, age) identical; every frame whose render differs
lies inside a stats-change command; on the reducer's banner ages every frame differs (the banner is drawn); the first frame of the
following command is byte-identical. Non-banner stats-change frames that differ are classified (elevated-opponent shadow hide /
the opponent's tracked rest / other).
  python3 tools/integration/scd112RouteDelta.py <base.json>[,<base2.json>] <final.json>[,<final2.json>] <out.json>
"""
import json, sys

def load(arg):
    out = []
    for p in arg.split(','):
        out += json.load(open(p))
    return {(r['seed'], r['slot'], r['scene']): r for r in out}

base, final = load(sys.argv[1]), load(sys.argv[2])
report, ok = {}, True
for key, f in final.items():
    b = base[key]
    name = '%d:%d:%s' % key
    same_timeline = (b['lastFrame'] == f['lastFrame'] and b['presentedFrames'] == f['presentedFrames']
                     and [x[:4] for x in b['frames']] == [x[:4] for x in f['frames']])
    diff = [i for i, (x, y) in enumerate(zip(b['frames'], f['frames'])) if x[4] != y[4]]
    outside = [f['frames'][i][:4] for i in diff if f['frames'][i][2] != 'stats-change']
    diffset = set(diff)
    commands = []
    for sc in f['statsChanges']:
        idx = [i for i, x in enumerate(f['frames']) if x[1] == sc['key']]
        ages = [f['frames'][i][3] for i in idx]
        banner = set(sc['bannerAges'])
        banner_frames = [i for i in idx if f['frames'][i][3] in banner]
        banner_same = [f['frames'][i][3] for i in banner_frames if i not in diffset]
        other_diff = [f['frames'][i][3] for i in idx if f['frames'][i][3] not in banner and i in diffset]
        nxt = idx[-1] + 1 if idx else None
        next_same = nxt is not None and nxt < len(f['frames']) and nxt not in diffset
        rest = (sc['x2Input'] is not None and sc['opponentSpecies'] in ('ONIX', 'RATTATA')
                and 'opponent' not in (sc['x2Input'] or {}).get('zeroed', []))
        cls = 'shadow' if sc['opponentElevated'] else 'rest' if rest else 'none'
        good = (len(idx) == sc['frames'] and ages == list(range(sc['frames'])) and not banner_same and next_same
                and (not other_diff or cls != 'none') and (cls == 'none' or len(other_diff) == sc['frames'] - len(banner_frames)))
        ok &= good
        commands.append({'frame': sc['frame'], 'battler': sc['battler'], 'argument': sc['argument'], 'species': sc['species'],
                         'frames': len(idx), 'bannerFramesDiffer': len(banner_frames) - len(banner_same), 'bannerFrames': len(banner_frames),
                         'nonBannerFramesDiffer': len(other_diff), 'nonBannerClass': cls, 'followingFirstFrameIdentical': next_same,
                         'ok': good})
    good_route = same_timeline and not outside and all(c['ok'] for c in commands)
    ok &= good_route
    report[name] = {'sameTimeline': same_timeline, 'lastFrame': f['lastFrame'], 'presentedFrames': f['presentedFrames'],
                    'framesDiffer': len(diff), 'framesDifferOutsideStatsChange': outside[:20], 'statsChangeCommands': commands,
                    'ok': good_route}
    print(name, 'OK' if good_route else 'FAIL', 'timeline same' if same_timeline else 'TIMELINE DIFF', 'differ', len(diff),
          'outside', len(outside), [(c['frame'], c['argument'], c['bannerFramesDiffer'], c['bannerFrames'], c['nonBannerFramesDiffer'],
                                     c['nonBannerClass'], c['followingFirstFrameIdentical']) for c in commands])
report['summary'] = {'routes': len(final), 'ok': ok}
json.dump(report, open(sys.argv[3], 'w'), indent=1)
print('ALL ROUTES OK' if ok else 'SOME ROUTES FAIL')
sys.exit(0 if ok else 1)
