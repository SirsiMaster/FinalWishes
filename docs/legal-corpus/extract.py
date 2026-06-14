import re,html,sys
def extract(path):
    h=open(path,encoding='utf-8',errors='replace').read()
    h=re.sub(r'(?is)<script.*?</script>','',h)
    h=re.sub(r'(?is)<style.*?</style>','',h)
    h=re.sub(r'(?i)<br\s*/?>','\n',h)
    h=re.sub(r'(?i)</p>','\n\n',h)
    h=re.sub(r'(?i)</div>','\n',h)
    h=re.sub(r'(?i)</tr>','\n',h)
    t=re.sub(r'(?s)<[^>]+>',' ',h)
    t=html.unescape(t)
    t='\n'.join(re.sub(r'[ \t]+',' ',line).strip() for line in t.split('\n'))
    t=re.sub(r'\n{3,}','\n\n',t).strip()
    return t
if __name__=='__main__':
    t=extract(sys.argv[1])
    print("LEN",len(t)); print("====="); print(t[:int(sys.argv[2]) if len(sys.argv)>2 else 1200])
