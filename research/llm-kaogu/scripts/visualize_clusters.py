import json, base64

with open('data/xunzhilu_clusters.json') as f:
    cl = json.load(f)
with open('data/xunzhilu_pca.json') as f:
    pca = json.load(f)

il = cl['image_labels']
cs = cl['cluster_sizes']
rl = cl['record_labels']
colors = ['#e94560','#0f3460','#533483','#00d2d3','#ff9f43','#ee5a24','#a55eea','#2ed573']

scatter = {}
for f, v in pca.items():
    scatter[f] = {'x': v[0], 'y': v[1], 'c': il.get(f, 0)}
scatter_b64 = base64.b64encode(json.dumps(scatter).encode()).decode()

cards = ''
for cid_str in sorted(cs.keys(), key=lambda x: int(x)):
    cid = int(cid_str)
    cnt = cs[cid_str]
    imgs = [f for f, l in il.items() if l == cid][:8]
    nrec = len([r for r, c in rl.items() if c == cid])
    tag = ''.join(f'<img src="data/r2-images/xunzhilu-v2/images/{s}" loading="lazy">' for s in imgs)
    cards += f'<div class="card"><h3 style="color:{colors[cid]}">Cluster {cid} ({cnt} imgs, {nrec} records)</h3><div class="ig">{tag}</div></div>\n'

page = f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Xunzhilu Clusters</title>
<style>
body{{font-family:sans-serif;margin:20px;background:#1a1a2e;color:#eee}}
h1{{color:#e94560}}
.stats{{display:flex;gap:20px;margin:20px 0}}
.stat{{background:#16213e;padding:15px 20px;border-radius:8px}}
.stat .num{{font-size:2em;color:#e94560}}
.grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}}
.card{{background:#16213e;border-radius:8px;padding:15px}}
.ig{{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}}
.ig img{{width:100%;border-radius:4px}}
canvas{{border-radius:8px;margin:20px 0}}
</style></head><body>
<h1>Xunzhilu Tomb Image Clusters</h1>
<div class="stats">
<div class="stat"><div class="num">543</div>Images</div>
<div class="stat"><div class="num">228</div>Records</div>
<div class="stat"><div class="num">8</div>Clusters</div>
</div>
<h2>Cluster Samples</h2>
<div class="grid">{cards}</div>
<h2>PCA Scatter</h2>
<canvas id="sc" width="800" height="600"></canvas>
<script>
const D=JSON.parse(atob("{scatter_b64}"));
const c=document.getElementById("sc"),x=c.getContext("2d");
const xs=Object.values(D).map(d=>d.x),ys=Object.values(D).map(d=>d.y);
const xM=Math.min(...xs),xX=Math.max(...xs),yM=Math.min(...ys),yX=Math.max(...ys);
const C=["#e94560","#0f3460","#533483","#00d2d3","#ff9f43","#ee5a24","#a55eea","#2ed573"];
x.fillStyle="#16213e";x.fillRect(0,0,800,600);
for(const[f,d]of Object.entries(D)){{
  const px=(d.x-xM)/(xX-xM)*760+20,py=(d.y-yM)/(yX-yM)*560+20;
  x.fillStyle=C[d.c%C.length];x.beginPath();x.arc(px,py,3,0,Math.PI*2);x.fill();
}}
</script></body></html>'''

with open('data/xunzhilu_clusters.html', 'w') as f:
    f.write(page)
print('Saved data/xunzhilu_clusters.html')
