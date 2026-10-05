#!/usr/bin/env python3
"""speciesAudit: list (stem, original fixture path, original scenario, swapped scenario, audit fixture) for the non-exact/errored rows of
fixtures/prep11/audit-golem-summary.json.  usage: speciesAuditList.py > /tmp/sa/list.tsv"""
import json, glob, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
d = json.load(open(f"{ROOT}/tools/integration/fixtures/prep11/audit-golem-summary.json"))
for k, v in d.items():
    if not os.environ.get("ALL") and "error" not in v and v["exactRows"] == v["rows"]: continue
    audit = f"tools/integration/fixtures/prep11/audit/audit-golem-{k}.json"
    if not os.path.exists(f"{ROOT}/{audit}"): continue
    orig = [p for p in glob.glob(f"{ROOT}/tools/integration/fixtures/**/{k}.json", recursive=True) if "/prep11/audit/" not in p and "species-audit" not in p]
    a = json.load(open(f"{ROOT}/{audit}"))
    print(k, os.path.relpath(orig[0], ROOT) if orig else "-", audit, a["scenario"], sep="\t")
