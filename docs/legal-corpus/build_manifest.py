#!/usr/bin/env python3
"""Deterministically assemble the CR-10 legal-corpus manifest from raw official
.gov HTML captures. NO LLM is in the text path (Rule 9): each `text` field is the
verbatim statute body, sliced between explicit markers from the official page.
"""
import re, html, json, sys

def extract(path):
    h = open(path, encoding='utf-8', errors='replace').read()
    h = re.sub(r'(?is)<script.*?</script>', '', h)
    h = re.sub(r'(?is)<style.*?</style>', '', h)
    h = re.sub(r'(?i)<br\s*/?>', '\n', h)
    h = re.sub(r'(?i)</p>', '\n\n', h)
    h = re.sub(r'(?i)</div>', '\n', h)
    h = re.sub(r'(?i)</tr>', '\n', h)
    t = re.sub(r'(?s)<[^>]+>', ' ', h)
    t = html.unescape(t).replace('\xa0', ' ')
    t = '\n'.join(re.sub(r'[ \t]+', ' ', ln).strip() for ln in t.split('\n'))
    t = re.sub(r'\n{3,}', '\n\n', t).strip()
    return t

def slice_body(path, start_pred, end_pred=None, include_end=False):
    """Return text from the first line satisfying start_pred to the line
    satisfying end_pred (exclusive unless include_end)."""
    lines = extract(path).split('\n')
    si = next(i for i, l in enumerate(lines) if start_pred(l))
    if end_pred is None:
        body = lines[si:]
    else:
        ei = next(i for i in range(si, len(lines)) if end_pred(lines[i]))
        body = lines[si:ei + 1] if include_end else lines[si:ei]
    out = '\n'.join(body)
    out = re.sub(r'\n{3,}', '\n\n', out).strip()
    return out

VERIFIED = "2026-06-14T00:00:00Z"

specs = []

# ---- Illinois (ilga.gov documents pages are pure statute, no chrome) ----
def il_full(path):
    return extract(path)

specs.append(dict(
    file='il-5-4-3.html',
    id='il-755-ilcs-5-4-3',
    jurisdiction='IL',
    title='Illinois Probate Act — Will Signing and Attestation',
    statuteReference='755 ILCS 5/4-3',
    sourceUrl='https://www.ilga.gov/documents/legislation/ilcs/documents/075500050K4-3.htm',
    publisher='Illinois General Assembly',
    licenseNote='U.S. state statute — public domain (Illinois Compiled Statutes)',
    text=il_full('il-5-4-3.html'),
))
specs.append(dict(
    file='il-45-3-3.html',
    id='il-755-ilcs-45-3-3',
    jurisdiction='IL',
    title='Illinois Power of Attorney Act — Statutory Short Form Power of Attorney for Property',
    statuteReference='755 ILCS 45/3-3',
    sourceUrl='https://www.ilga.gov/documents/legislation/ilcs/documents/075500450K3-3.htm',
    publisher='Illinois General Assembly',
    licenseNote='U.S. state statute — public domain (Illinois Compiled Statutes)',
    text=il_full('il-45-3-3.html'),
))
specs.append(dict(
    file='il-45-4-10.html',
    id='il-755-ilcs-45-4-10',
    jurisdiction='IL',
    title='Illinois Power of Attorney Act — Statutory Short Form Power of Attorney for Health Care',
    statuteReference='755 ILCS 45/4-10',
    sourceUrl='https://www.ilga.gov/documents/legislation/ilcs/documents/075500450K4-10.htm',
    publisher='Illinois General Assembly',
    licenseNote='U.S. state statute — public domain (Illinois Compiled Statutes)',
    text=il_full('il-45-4-10.html'),
))

# ---- Maryland (mgaleg page wraps statute in site chrome) ----
md_body = slice_body(
    'md-5-603.html',
    start_pred=lambda l: l.strip().startswith('§5'),
    end_pred=lambda l: l.strip() == 'Previous Next',
)
specs.append(dict(
    id='md-hg-5-603',
    jurisdiction='MD',
    title='Maryland Health-General — Advance Directive Statutory Form',
    statuteReference='Md. Code, Health-General § 5-603',
    sourceUrl='https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=ghg&section=5-603&enactments=false',
    publisher='Maryland General Assembly (Department of Legislative Services)',
    licenseNote='U.S. state statute — public domain (Annotated Code of Maryland)',
    text=md_body,
))

# ---- Minnesota (revisor.mn.gov; body = heading .. History: inclusive) ----
mn_507 = slice_body(
    'mn-507-071.html',
    start_pred=lambda l: l.strip().startswith('507.071 TRANSFER ON DEATH DEEDS'),
    end_pred=lambda l: l.strip().startswith('Official Publication of the State of Minnesota'),
)
specs.append(dict(
    id='mn-507-071',
    jurisdiction='MN',
    title='Minnesota Statutes — Transfer on Death Deeds',
    statuteReference='Minn. Stat. § 507.071',
    sourceUrl='https://www.revisor.mn.gov/statutes/cite/507.071',
    publisher='Minnesota Office of the Revisor of Statutes',
    licenseNote='U.S. state statute — public domain (Minnesota Statutes)',
    text=mn_507,
))
mn_145c16 = slice_body(
    'mn-145c-16.html',
    start_pred=lambda l: l.strip().startswith('145C.16 SUGGESTED FORM'),
    end_pred=lambda l: l.strip().startswith('Official Publication of the State of Minnesota'),
)
specs.append(dict(
    id='mn-145c-16',
    jurisdiction='MN',
    title='Minnesota Statutes — Health Care Directive Suggested Form',
    statuteReference='Minn. Stat. § 145C.16',
    sourceUrl='https://www.revisor.mn.gov/statutes/cite/145C.16',
    publisher='Minnesota Office of the Revisor of Statutes',
    licenseNote='U.S. state statute — public domain (Minnesota Statutes)',
    text=mn_145c16,
))
mn_145c05 = slice_body(
    'mn-145c-05.html',
    start_pred=lambda l: l.strip().startswith('145C.05 SUGGESTED FORM'),
    end_pred=lambda l: l.strip().startswith('Official Publication of the State of Minnesota'),
)
specs.append(dict(
    id='mn-145c-05',
    jurisdiction='MN',
    title='Minnesota Statutes — Health Care Directive; Provisions That May Be Included',
    statuteReference='Minn. Stat. § 145C.05',
    sourceUrl='https://www.revisor.mn.gov/statutes/cite/145C.05',
    publisher='Minnesota Office of the Revisor of Statutes',
    licenseNote='U.S. state statute — public domain (Minnesota Statutes)',
    text=mn_145c05,
))

sources = []
for s in specs:
    s.pop('file', None)
    txt = s['text']
    assert txt and len(txt) > 200, f"{s['id']} text too short: {len(txt)}"
    s['verifiedAt'] = VERIFIED
    # order keys per schema
    sources.append({
        'id': s['id'], 'jurisdiction': s['jurisdiction'], 'title': s['title'],
        'statuteReference': s['statuteReference'], 'sourceUrl': s['sourceUrl'],
        'publisher': s['publisher'], 'licenseNote': s['licenseNote'],
        'verifiedAt': s['verifiedAt'], 'text': txt,
    })

manifest = {'sources': sources}
out = json.dumps(manifest, indent=2, ensure_ascii=False)
open(sys.argv[1], 'w', encoding='utf-8').write(out + '\n')
for s in sources:
    print(f"{s['id']:24s} {s['jurisdiction']:3s} {len(s['text']):6d} chars  {s['statuteReference']}")
print(f"\nWROTE {sys.argv[1]} ({len(out)} bytes, {len(sources)} sources)")
