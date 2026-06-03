#!/usr/bin/env python3
"""Unify Tameeka's 3 duplicate 'Lockhart Family Estate' records into ONE.

CANONICAL = 2Q1oyBTqYox4LwI8ZwRc  (THE REAL ESTATE — already holds her 2 heirs
and her 2 estate_invitations). The estate doc's principalId is already her uid;
only her estate_users junction wrongly says role:heir (a self-invite artifact),
which we correct to principal so she has full write access.

Plan:
  1. estate_users/{fjhdz}_2Q1oy : role heir -> principal (align with estate.principalId).
  2. users/{fjhdz}.primaryEstateId -> 2Q1oy (+ primaryEstateName).
  3. Delete the two EMPTY duplicates A7Qdd (no subcollections) and 12Co1Ju
     (1 disposable shepherd-message): subcollection docs, estate docs, and her
     estate_users junctions for them.
  4. Leave 2Q1oy estate doc, its heirs (already status:active), and its
     invitations untouched.

DRY_RUN=True prints actions without writing. Set False to execute.
"""
import json, subprocess

DRY_RUN = True
CANON = "2Q1oyBTqYox4LwI8ZwRc"            # the real deal
CANON_NAME = "The Lockhart Family Estate"
DUPES = ["A7QdddIX5qWOfSNxYk5k", "12Co1JuiMzBDybSa5JVj"]   # empties to remove
TAMEEKA = "fjhdzIdmV1SeOai5QizgCjzzAlx1"
FS = "https://firestore.googleapis.com/v1/projects/finalwishes-prod/databases/(default)/documents"

T = subprocess.check_output(["gcloud","auth","print-access-token","--account=claude-agent@finalwishes-prod.iam.gserviceaccount.com"]).decode().strip()
def curl(args):
    p = subprocess.run(["curl","-s","-w","\n%{http_code}"]+args+["-H",f"Authorization: Bearer {T}"], capture_output=True)
    o=p.stdout.decode(); t,_,c=o.rpartition("\n")
    try: return int(c), json.loads(t)
    except: return (int(c) if c.isdigit() else 0), t
def get(path): return curl([f"{FS}/{path}"])
def patch(path, fields, mask):
    q = "&".join(f"updateMask.fieldPaths={m}" for m in mask)
    if DRY_RUN: print(f"  [DRY] PATCH {path} {list(fields)}"); return 200
    sc,_ = curl(["-X","PATCH",f"{FS}/{path}?{q}","-H","Content-Type: application/json","-d",json.dumps({"fields":fields})]); return sc
def delete(path):
    if DRY_RUN: print(f"  [DRY] DELETE {path}"); return 200
    sc,_ = curl(["-X","DELETE",f"{FS}/{path}"]); return sc

print(f"=== UNIFY into {CANON} (the real deal)  DRY_RUN={DRY_RUN} ===")

# 1. Fix her junction on the canonical estate: heir -> principal
print("\n[1] estate_users junction heir -> principal")
print(f"  estate_users/{TAMEEKA}_{CANON}: role=principal")
patch(f"estate_users/{TAMEEKA}_{CANON}", {"role":{"stringValue":"principal"}}, ["role"])

# 2. Point her primaryEstateId at the canonical estate
print("\n[2] users.primaryEstateId -> CANON")
patch(f"users/{TAMEEKA}",
      {"primaryEstateId":{"stringValue":CANON}, "primaryEstateName":{"stringValue":CANON_NAME}},
      ["primaryEstateId","primaryEstateName"])

# 3. Delete the two empty duplicates + their subcollections + junctions
print("\n[3] Delete empty duplicates")
for dup in DUPES:
    sc,cols = curl(["-X","POST",f"{FS}/estates/{dup}:listCollectionIds","-H","Content-Type: application/json","-d","{}"])
    for c in (cols.get("collectionIds",[]) if isinstance(cols,dict) else []):
        sc,d = get(f"estates/{dup}/{c}?pageSize=50")
        for doc in d.get("documents",[]):
            delete(f"estates/{dup}/{c}/{doc['name'].split('/')[-1]}")
    delete(f"estates/{dup}")
    sc,d = curl(["-X","POST",f"{FS}:runQuery","-H","Content-Type: application/json","-d",
        json.dumps({"structuredQuery":{"from":[{"collectionId":"estate_users"}],
        "where":{"fieldFilter":{"field":{"fieldPath":"estateId"},"op":"EQUAL","value":{"stringValue":dup}}}}})])
    for row in d if isinstance(d,list) else []:
        doc=row.get("document")
        if doc: delete(f"estate_users/{doc['name'].split('/')[-1]}")

print(f"\n=== DONE (DRY_RUN={DRY_RUN}). After: login -> primaryEstate {CANON} -> 2 heirs visible, she is principal. ===")
