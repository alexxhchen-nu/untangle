"""
QGIS tomb visualization — generates a map from extracted tomb data.
Runs headless on VPS, outputs PNG.
"""
import sys, json, os
sys.path.insert(0, '/usr/lib/python3/dist-packages')

from qgis.core import (
    QgsApplication, QgsVectorLayer, QgsFeature, QgsGeometry,
    QgsPointXY, QgsField, QgsProject, QgsSymbol,
    QgsSingleSymbolRenderer, QgsCategorizedSymbolRenderer,
    QgsRendererCategory, QgsPalLayerSettings, QgsVectorLayerSimpleLabeling,
    QgsMapSettings, QgsMapRendererSequentialJob
)
from PyQt5.QtCore import QVariant
from PyQt5.QtGui import QColor, QFont

# Initialize QGIS
qgs = QgsApplication([], False)
qgs.initQgis()

project = QgsProject.instance()

# === Create tomb layer ===
# 满城汉墓 location: ~38.95°N, 115.32°E (Hebei, China)
# Schematic layout of tomb complex

tomb_data = [
    {
        "id": "M1", "name": "一号墓（刘胜墓）",
        "type": "崖墓", "dynasty": "西汉",
        "lat": 38.951, "lon": 115.318,
        "length": 51.7, "width": 37.5, "depth": 28.5,
        "artifacts": "金缕玉衣、铜壶、铜鼎、铁器",
        "description": "西汉中山靖王刘胜墓，凿山为陵"
    },
    {
        "id": "M2", "name": "二号墓（窦绾墓）",
        "type": "崖墓", "dynasty": "西汉",
        "lat": 38.949, "lon": 115.319,
        "length": 49.7, "width": 65.2, "depth": 17.2,
        "artifacts": "金缕玉衣、铜灯（长信宫灯）、铜壶",
        "description": "刘胜妻窦绾墓，出土长信宫灯"
    },
    {
        "id": "M3", "name": "陪葬墓区",
        "type": "土坑墓", "dynasty": "西汉",
        "lat": 38.947, "lon": 115.320,
        "length": 5.0, "width": 3.0, "depth": 4.0,
        "artifacts": "陶罐、铜镜",
        "description": "陪葬墓群"
    }
]

# Create memory layer
layer = QgsVectorLayer("Point?crs=EPSG:4326", "满城汉墓", "memory")
provider = layer.dataProvider()

# Add fields
provider.addAttributes([
    QgsField("id", QVariant.String),
    QgsField("name", QVariant.String),
    QgsField("type", QVariant.String),
    QgsField("dynasty", QVariant.String),
    QgsField("length_m", QVariant.Double),
    QgsField("width_m", QVariant.Double),
    QgsField("depth_m", QVariant.Double),
    QgsField("artifacts", QVariant.String),
    QgsField("description", QVariant.String),
])
layer.updateFields()

# Add features
for td in tomb_data:
    feat = QgsFeature(layer.fields())
    feat.setGeometry(QgsGeometry.fromPointXY(QgsPointXY(td["lon"], td["lat"])))
    feat.setAttributes([
        td["id"], td["name"], td["type"], td["dynasty"],
        td["length"], td["width"], td["depth"],
        td["artifacts"], td["description"]
    ])
    provider.addFeature(feat)

layer.updateExtents()

# === Style the layer ===
# Color by tomb type
categories = []
for tomb_type, color in [("崖墓", QColor("#e74c3c")), ("土坑墓", QColor("#3498db"))]:
    symbol = QgsSymbol.defaultSymbol(layer.geometryType())
    symbol.setColor(color)
    symbol.setSize(8)
    cat = QgsRendererCategory(tomb_type, symbol, tomb_type)
    categories.append(cat)

renderer = QgsCategorizedSymbolRenderer("type", categories)
layer.setRenderer(renderer)

# === Add labels ===
label_settings = QgsPalLayerSettings()
label_settings.fieldName = "name"
label_settings.enabled = True
label_settings.placement = QgsPalLayerSettings.AroundPoint
label_settings.dist = 4
layer.setLabeling(QgsVectorLayerSimpleLabeling(label_settings))
layer.setLabelsEnabled(True)

project.addMapLayer(layer)

# === Render to image ===
settings = QgsMapSettings()
settings.setLayers([layer])
settings.setExtent(layer.extent().buffered(0.005))
from PyQt5.QtCore import QSize
settings.setOutputSize(QSize(1200, 900))
settings.setDestinationCrs(layer.crs())

output_path = "data/maps/满城汉墓_分布图.png"
os.makedirs(os.path.dirname(output_path), exist_ok=True)

job = QgsMapRendererSequentialJob(settings)
job.start()
job.waitForFinished()

image = job.renderedImage()
image.save(output_path)

print(f"Map saved to: {output_path}")
print(f"Image size: {image.width()}x{image.height()}")

# Also export as GeoJSON
geojson_path = "data/maps/满城汉墓_tombs.geojson"
from qgis.core import QgsVectorFileWriter
QgsVectorFileWriter.writeAsVectorFormat(layer, geojson_path, "utf-8", layer.crs(), "GeoJSON")
print(f"GeoJSON saved to: {geojson_path}")

qgs.exitQgis()
