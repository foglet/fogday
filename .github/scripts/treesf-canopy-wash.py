"""Builds treesf/canopy-wash.png, the tree canopy the page shows below zoom 14.

The true canopy polygons (/tmp/canopy.geojson) are burned into a 2 m grid in Web Mercator, then averaged to about
8 m (6 m on the ground here), so each pixel's alpha is the share of it under canopy. One green, alpha = coverage;
the page sets the overall transparency. Web Mercator so the image lines up when Mapbox stretches it between the
four corners of SF_BOUNDS. Run by .github/workflows/treesf-canopy.yml.
"""
import math, subprocess, sys
import numpy as np
from PIL import Image

W_LON, S_LAT, E_LON, N_LAT = -122.555, 37.695, -122.345, 37.838   # the page's SF_BOUNDS
GREEN = (0x8f, 0xd8, 0x7a)   # the page's CANOPY_GREEN
FINE, COARSE = 2.0, 8.0       # Web Mercator meters per pixel: burn, then average

def merc(lon, lat):
    r = 6378137.0
    return r * math.radians(lon), r * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))

x0, y0 = merc(W_LON, S_LAT)
x1, y1 = merc(E_LON, N_LAT)
w, h = round((x1 - x0) / COARSE), round((y1 - y0) / COARSE)
te = [str(v) for v in (x0, y0, x1, y1)]

def run(*a):
    print("+", " ".join(a), flush=True)
    subprocess.run(a, check=True)

run("ogr2ogr", "-f", "GPKG", "-t_srs", "EPSG:3857", "-nln", "canopy", "-nlt", "PROMOTE_TO_MULTI",
    "/tmp/canopy3857.gpkg", "/tmp/canopy.geojson")
run("gdal_rasterize", "-l", "canopy", "-burn", "255", "-init", "0", "-ot", "Byte",
    "-tr", str(FINE), str(FINE), "-te", *te, "-co", "COMPRESS=DEFLATE", "-co", "TILED=YES", "-co", "BIGTIFF=YES",
    "/tmp/canopy3857.gpkg", "/tmp/canopy-fine.tif")
run("gdalwarp", "-overwrite", "-r", "average", "-ts", str(w), str(h), "-te", *te, "-ot", "Byte", "-of", "ENVI",
    "/tmp/canopy-fine.tif", "/tmp/canopy-wash.bin")

alpha = np.fromfile("/tmp/canopy-wash.bin", dtype=np.uint8)
if alpha.size != w * h:
    sys.exit(f"expected {w}x{h} pixels, got {alpha.size}")
alpha = alpha.reshape(h, w)
share = alpha.astype(np.float64).sum() / (255 * w * h)
print(f"wash {w}x{h}, canopy share of the box {share:.1%}")   # the box is about half water; the city is 13.7%
if not 0.03 < share < 0.2:
    sys.exit("canopy share far off; not writing the image")

rgba = np.zeros((h, w, 4), dtype=np.uint8)
rgba[..., 0], rgba[..., 1], rgba[..., 2] = GREEN
rgba[..., 3] = alpha
Image.fromarray(rgba, "RGBA").save("treesf/canopy-wash.png", optimize=True)
