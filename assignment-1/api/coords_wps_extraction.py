# ---------------------
# Coordinate Extraction function using WPS specification
# ---------------------
from osgeo import ogr
import json

def title():
    return "Coordinate Extraction"  # Title of the function

def abstract():
    return "Extracts the X (longitude) and Y (latitude) coordinates from a point geometry."  # Short description

def inputs():
    return [
        ['feature', 'Input feature', 'A point geometry in GeoJSON format.', 'application/json', True]
    ]

def outputs():
    return [
        ['x', 'Longitude', 'The X coordinate (longitude) of the point.', 'text/plain'],
        ['y', 'Latitude', 'The Y coordinate (latitude) of the point.', 'text/plain']
    ]

def execute(parameters):
    point_geojson = {
      "type": "Point",
      "coordinates": [6.88587, 52.22443]
    }

    # Convert dict to JSON string
    feature = json.dumps(point_geojson)
    

    input_geom = ogr.CreateGeometryFromJson(feature)
    if input_geom is None:
        raise ValueError("Invalid GeoJSON geometry: Could not parse input.")

    x_coord = input_geom.GetX()
    y_coord = input_geom.GetY()

    print("Content-type: text/plain\n")
    print(f"x={x_coord}\ny={y_coord}")
