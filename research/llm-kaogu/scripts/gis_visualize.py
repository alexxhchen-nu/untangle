import sqlite3, json, argparse
from pathlib import Path

KNOWN_COORDS = {
    "满城": (38.95, 115.32), "保定": (38.87, 115.46), "石家庄": (38.04, 114.51),
    "邢台": (37.07, 114.50), "邯郸": (36.60, 114.49), "涿州": (39.49, 115.97),
    "鹿泉": (38.09, 114.31), "武邑": (37.80, 115.89), "柏乡": (37.49, 114.69),
    "献县": (38.17, 116.10), "深州": (38.00, 115.56), "博野": (38.46, 115.46),
    "内邱": (37.29, 114.51), "涉县": (36.58, 113.69), "景县": (37.69, 116.27),
    "故城": (37.35, 115.97), "滦平": (40.94, 117.33), "固安": (39.44, 116.30),
    "蔚县": (39.84, 114.57), "徐水": (39.02, 115.65), "易县": (39.35, 115.50),
    "磁县": (36.37, 114.38), "燕下都": (39.35, 115.50),
    "讲武城": (36.35, 114.35), "双庙": (36.36, 114.36),
}

def geocode_site(name, province=None):
    for key, coords in KNOWN_COORDS.items():
        if key in name:
            return coords
    if province == "河北": return (38.0, 115.0)
    return None

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", default="kaogu.db")
    p.add_argument("--output", default="data/map.html")
    args = p.parse_args()
    
    db_path = args.db
    conn = sqlite3.connect(db_path)
    
    rows = conn.execute("""
        SELECT s.id, s.name, s.province, s.city, s.latitude, s.longitude,
               COUNT(t.id) as tomb_count,
               GROUP_CONCAT(DISTINCT t.dynasty) as dynasties
        FROM sites s LEFT JOIN tombs t ON t.site_id = s.id GROUP BY s.id
    """).fetchall()
    
    features = []
    geocoded = 0
    for sid, name, prov, city, lat, lon, tc, dyn in rows:
        if lat is None or lon is None:
            coords = geocode_site(name, prov)
            if coords:
                lat, lon = coords
                geocoded += 1
                conn.execute("UPDATE sites SET latitude=?, longitude=? WHERE id=?", (lat, lon, sid))
                conn.commit()
        if lat and lon:
            features.append({"type":"Feature","geometry":{"type":"Point","coordinates":[lon,lat]},
                "properties":{"name":name,"province":prov or "","city":city or "",
                              "tomb_count":tc,"dynasties":dyn or ""}})
    
    # Also add tomb-only data grouped by report
    if not rows:
        report_rows = conn.execute("""
            SELECT r.title, COUNT(t.id) as tomb_count,
                   GROUP_CONCAT(DISTINCT t.dynasty) as dynasties
            FROM reports r LEFT JOIN tombs t ON t.report_id = r.id
            GROUP BY r.id HAVING tomb_count > 0
        """).fetchall()
        for title, tc, dyn in report_rows:
            coords = geocode_site(title)
            if coords:
                lat, lon = coords
                features.append({"type":"Feature","geometry":{"type":"Point","coordinates":[lon,lat]},
                    "properties":{"name":title,"province":"","city":"",
                                  "tomb_count":tc,"dynasties":dyn or ""}})
    
    conn.close()
    
    geojson = {"type":"FeatureCollection","features":features}
    total_tombs = sum(f["properties"]["tomb_count"] for f in features)
    
    # Write HTML without f-string to avoid brace issues
    html = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>考古墓葬分布图</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
body{margin:0;padding:0;font-family:sans-serif}
#map{width:100%;height:100vh}
.info{position:absolute;top:10px;right:10px;z-index:1000;background:#fff;padding:15px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.2);max-width:300px}
.info h3{margin:0 0 10px}
.stat{margin:5px 0;font-size:14px}
.legend{position:absolute;bottom:30px;left:10px;z-index:1000;background:#fff;padding:10px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.2)}
.legend-item{display:flex;align-items:center;margin:5px 0}
.dot{border-radius:50%;margin-right:8px}
</style></head>
<body>
<div id="map"></div>
<div class="info">
<h3>考古墓葬分布图</h3>
<div class="stat">站点: <b>""" + str(len(features)) + """</b></div>
<div class="stat">墓葬: <b>""" + str(total_tombs) + """</b></div>
<div class="stat" style="font-size:12px;color:#666">点击标记查看详情</div>
</div>
<div class="legend">
<div style="font-weight:bold;margin-bottom:8px">墓葬数量</div>
<div class="legend-item"><div class="dot" style="background:#3388ff;width:10px;height:10px"></div>1-5</div>
<div class="legend-item"><div class="dot" style="background:#ff6b35;width:14px;height:14px"></div>6-20</div>
<div class="legend-item"><div class="dot" style="background:#ff1744;width:18px;height:18px"></div>21+</div>
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map("map").setView([38.5, 115.5], 7);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap", maxZoom: 18
}).addTo(map);
var data = """ + json.dumps(geojson, ensure_ascii=False) + """;
function getColor(c) { return c > 20 ? "#ff1744" : c > 5 ? "#ff6b35" : "#3388ff"; }
function getSize(c) { return c > 20 ? 14 : c > 5 ? 10 : 7; }
L.geoJSON(data, {
    pointToLayer: function(f, ll) {
        return L.circleMarker(ll, {
            radius: getSize(f.properties.tomb_count),
            fillColor: getColor(f.properties.tomb_count),
            color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.8
        });
    },
    onEachFeature: function(f, l) {
        var p = f.properties;
        l.bindPopup("<h4>" + p.name + "</h4><p>省份:" + p.province + "</p><p>墓葬:" + p.tomb_count + "</p><p>朝代:" + p.dynasties + "</p>");
        if (p.tomb_count > 10)
            l.bindTooltip(p.name + "(" + p.tomb_count + ")", {permanent: true, direction: "right"});
    }
}).addTo(map);
if (data.features.length > 0)
    map.fitBounds(L.geoJSON(data).getBounds().pad(0.1));
</script></body></html>"""
    
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print("Done:", out, "|", len(features), "sites |", total_tombs, "tombs")

if __name__ == "__main__":
    main()
