#!/usr/bin/env python3
"""Fail-closed unification of Tameeka's 3 duplicate estates into the REAL one
(2Q1oy). Hardened per codex-finalwishes review (FAIL -> required guardrails):
preflight snapshot assertions, hard HTTP-status aborts, exact delete-set,
external-reference scan, pagination guards, postcondition verification.

DRY_RUN=True  -> preflight + print intended ops, NO writes.
DRY_RUN=False -> preflight (abort on any drift) then execute, then verify.
"""
import json, subprocess, sys

DRY_RUN = True
CANON = "2Q1oyBTqYox4LwI8ZwRc"
CANON_NAME = "The Lockhart Family Estate"
DUPES = ["A7QdddIX5qWOfSNxYk5k", "12Co1JuiMzBDybSa5JVj"]
TAMEEKA = "fjhdzIdmV1SeOai5QizgCjzzAlx1"
EXPECT_HEIR_COUNT = 2
FS = "https://firestore.googleapis.com/v1/projects/finalwishes-prod/databases/(default)/documents"
T = subprocess.check_output(["gcloud","auth","print-access-token","--account=claude-agent@finalwishes-prod.iam.gserviceaccount.com"]).decode().strip()

class Abort(Exception): pass
def die(msg): raise Abort(msg)

def call(method, path, body=None, params=""):
    args=["curl","-s","-w","\n%{http_code}","-X",method,f"{FS}/{path}{params}","-H",f"Authorization: Bearer {T}"]
    if body is not None: args+=["-H","Content-Type: application/json","-d",json.dumps(body)]
    p=subprocess.run(args,capture_output=True)
    o=p.stdout.decode(); t,_,c=o.rpartition("\n")
    try: j=json.loads(t)
    except: j=t
    return (int(c) if c.isdigit() else 0), j

def runquery(coll, field, value):
    sc,j = call("POST",":runQuery",{"structuredQuery":{"from":[{"collectionId":coll}],
        "where":{"fieldFilter":{"field":{"fieldPath":field},"op":"EQUAL","value":{"stringValue":value}}}}})
    if sc!=200: die(f"runQuery {coll} {field}={value} -> HTTP {sc}: {j}")
    return [r["document"] for r in (j if isinstance(j,list) else []) if r.get("document")]

def fval(doc, key):
    f=doc.get("fields",{}).get(key,{})
    return list(f.values())[0] if f else None

# ── PREFLIGHT (always runs; aborts on any drift) ─────────────────────────────
print("=== PREFLIGHT (asserting expected live snapshot) ===")

sc, est = call("GET", f"estates/{CANON}")
if sc!=200: die(f"canonical estate {CANON} GET -> {sc}")
if fval(est,"principalId")!=TAMEEKA: die(f"canonical principalId != Tameeka ({fval(est,'principalId')})")
print(f"  canonical {CANON}: principalId=Tameeka OK")

sc, heirs = call("GET", f"estates/{CANON}/heirs", params="?pageSize=100")
if sc!=200: die(f"canonical heirs GET -> {sc}")
if "nextPageToken" in (heirs if isinstance(heirs,dict) else {}): die("canonical heirs paginated — unexpected scale")
hc=len(heirs.get("documents",[]))
if hc!=EXPECT_HEIR_COUNT: die(f"canonical heirs count {hc} != expected {EXPECT_HEIR_COUNT}")
print(f"  canonical heirs: {hc} OK")

sc, j2 = call("GET", f"estate_users/{TAMEEKA}_{CANON}")
if sc!=200: die(f"canonical junction GET -> {sc}")
if fval(j2,"role")!="heir": die(f"canonical junction role expected 'heir', got {fval(j2,'role')}")
print("  canonical junction role=heir (will fix->principal) OK")

sc, user = call("GET", f"users/{TAMEEKA}")
if sc!=200: die(f"user doc GET -> {sc}")
print(f"  user doc OK (primaryEstateId now={fval(user,'primaryEstateId')})")

EXPECT_SUBCOL = {"A7QdddIX5qWOfSNxYk5k": {}, "12Co1JuiMzBDybSa5JVj": {"shepherd-messages":1}}
for dup in DUPES:
    sc, d = call("GET", f"estates/{dup}")
    if sc!=200: die(f"dup estate {dup} GET -> {sc}")
    if fval(d,"principalId")!=TAMEEKA: die(f"dup {dup} principalId != Tameeka — refusing to delete someone else's estate")
    sc, jd = call("GET", f"estate_users/{TAMEEKA}_{dup}")
    if sc!=200: die(f"dup junction {dup} GET -> {sc}")
    sc, cols = call("POST", f"estates/{dup}:listCollectionIds", {})
    if sc!=200: die(f"preflight listCollectionIds {dup} -> HTTP {sc}: {cols}")
    if "nextPageToken" in (cols if isinstance(cols,dict) else {}):
        die(f"preflight {dup} listCollectionIds paginated — unexpected, ABORT")
    colids = cols.get("collectionIds",[]) if isinstance(cols,dict) else []
    inv={}
    for c in colids:
        sc, dd = call("GET", f"estates/{dup}/{c}", params="?pageSize=100")
        if sc!=200: die(f"dup {dup}/{c} GET -> {sc}")
        if "nextPageToken" in (dd if isinstance(dd,dict) else {}): die(f"dup {dup}/{c} paginated — unexpected data volume, abort")
        n=len(dd.get("documents",[]))
        if n: inv[c]=n
    if inv != EXPECT_SUBCOL[dup]:
        die(f"dup {dup} subcollections {inv} != expected {EXPECT_SUBCOL[dup]} — drift, ABORT")
    print(f"  dup {dup}: principal=Tameeka, subcols={inv} OK")

for dup in DUPES:
    docs = runquery("estate_users","estateId",dup)
    ids = sorted(x["name"].split("/")[-1] for x in docs)
    expect = [f"{TAMEEKA}_{dup}"]
    if ids != expect:
        die(f"estate_users referencing {dup} = {ids}, expected only {expect} — refuse to touch others' access")
print("  estate_users delete-set is exactly Tameeka's 2 junctions OK")

for coll in ["estate_invitations","payments","notifications"]:
    for dup in DUPES:
        # Fail-closed: runquery() aborts on any non-200 (it does not swallow
        # errors). A query failure must STOP the migration, never be read as
        # "no references" — that would risk deleting a still-referenced estate.
        refs = runquery(coll, "estateId", dup)
        if refs:
            die(f"{coll} has {len(refs)} live ref(s) to {dup} — must migrate/clear first, ABORT")
print("  no live estate_invitations/payments/notifications refs to dupes OK")

print("\nPREFLIGHT PASSED. Intended operations:")
print(f"  [1] PATCH estate_users/{TAMEEKA}_{CANON} role=principal")
print(f"  [2] PATCH users/{TAMEEKA} primaryEstateId={CANON} (+name)")
for dup in DUPES:
    for c,n in EXPECT_SUBCOL[dup].items(): print(f"  [3] DELETE {n} doc(s) in estates/{dup}/{c}")
    print(f"  [3] DELETE estates/{dup}  + estate_users/{TAMEEKA}_{dup}")

if DRY_RUN:
    print("\nDRY_RUN=True — no writes performed."); sys.exit(0)

# ── EXECUTE (status-checked, exact ids) ──────────────────────────────────────
print("\n=== EXECUTE ===")
def must(method, path, body=None, params="", ok=(200,)):
    sc, j = call(method, path, body, params)
    if sc not in ok: die(f"{method} {path} -> HTTP {sc}: {j}")
    print(f"  {method} {path} -> {sc}")
    return j

must("PATCH", f"estate_users/{TAMEEKA}_{CANON}", {"fields":{"role":{"stringValue":"principal"}}},
     params="?updateMask.fieldPaths=role")
must("PATCH", f"users/{TAMEEKA}",
     {"fields":{"primaryEstateId":{"stringValue":CANON},"primaryEstateName":{"stringValue":CANON_NAME}}},
     params="?updateMask.fieldPaths=primaryEstateId&updateMask.fieldPaths=primaryEstateName")
for dup in DUPES:
    sc, cols = call("POST", f"estates/{dup}:listCollectionIds", {})
    if sc!=200: die(f"execute listCollectionIds {dup} -> HTTP {sc}: {cols}")
    if "nextPageToken" in (cols if isinstance(cols,dict) else {}):
        die(f"execute {dup} listCollectionIds paginated — refuse to delete a partial estate, ABORT")
    for c in (cols.get("collectionIds",[]) if isinstance(cols,dict) else []):
        sc, dd = call("GET", f"estates/{dup}/{c}", params="?pageSize=100")
        if sc!=200: die(f"execute GET {dup}/{c} -> HTTP {sc}: {dd}")
        if "nextPageToken" in (dd if isinstance(dd,dict) else {}):
            die(f"execute {dup}/{c} paginated — refuse to delete a partial page, ABORT")
        for doc in dd.get("documents",[]):
            must("DELETE", f"estates/{dup}/{c}/{doc['name'].split('/')[-1]}")
    must("DELETE", f"estates/{dup}")
    must("DELETE", f"estate_users/{TAMEEKA}_{dup}")

# ── POSTCONDITION ────────────────────────────────────────────────────────────
print("\n=== POSTCONDITION VERIFY ===")
# Explicit die() (not assert) so checks hold even under `python -O`.
sc,u = call("GET", f"users/{TAMEEKA}")
if sc!=200: die(f"post: user GET -> {sc}")
if fval(u,"primaryEstateId")!=CANON: die(f"post: primaryEstateId={fval(u,'primaryEstateId')} != {CANON}")
sc,jj = call("GET", f"estate_users/{TAMEEKA}_{CANON}")
if sc!=200: die(f"post: canonical junction GET -> {sc}")
if fval(jj,"role")!="principal": die(f"post: junction role={fval(jj,'role')} != principal")
for dup in DUPES:
    sc,_=call("GET", f"estates/{dup}")
    if sc!=404: die(f"post: estates/{dup} still exists ({sc})")
    sc,_=call("GET", f"estate_users/{TAMEEKA}_{dup}")
    if sc!=404: die(f"post: junction {dup} still exists ({sc})")
sc,h = call("GET", f"estates/{CANON}/heirs", params="?pageSize=100")
if sc!=200: die(f"post: canonical heirs GET -> {sc}")
if len(h.get("documents",[]))!=EXPECT_HEIR_COUNT: die("post: canonical heir count changed")
print(f"  primaryEstateId={CANON} OK; junction=principal OK; dupes gone OK; heirs={EXPECT_HEIR_COUNT} OK")
print("\n=== UNIFICATION COMPLETE ===")
