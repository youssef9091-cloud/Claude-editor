import json, math, numpy as np
def load_topo(path):
    T=json.load(open(path)); sc=T['transform']['scale']; tr=T['transform']['translate']
    arcs=[]
    for a in T['arcs']:
        a=np.cumsum(np.array(a,dtype=np.float64),axis=0)
        arcs.append(np.column_stack([a[:,0]*sc[0]+tr[0],a[:,1]*sc[1]+tr[1]]))
    def ring(idx):
        pts=[]
        for i in idx:
            a=arcs[i] if i>=0 else arcs[~i][::-1]
            pts.append(a if not pts else a[1:])
        return np.concatenate(pts)
    out={}
    for g in T['objects']['countries']['geometries']:
        polys=[]
        if g['type']=='Polygon': P=[g['arcs']]
        elif g['type']=='MultiPolygon': P=g['arcs']
        else: continue
        for p in P: polys.append([ring(r) for r in p])
        out[g.get('id',g['properties'].get('name'))]=(g['properties'].get('name'),polys)
    return out
def merc(lon,lat):
    lat=np.clip(lat,-85,85)
    return np.radians(lon), np.log(np.tan(np.pi/4+np.radians(lat)/2))
