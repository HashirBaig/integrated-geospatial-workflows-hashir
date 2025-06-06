/*--- Common functions ---*/

import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import TileImage from "ol/source/TileImage";

import WMTS from "ol/source/WMTS";
import WMTSTileGrid from "ol/tilegrid/WMTS";

import Projection from "ol/proj/Projection";
import { getTopLeft } from "ol/extent";
import { createStringXY } from "ol/coordinate";

import MousePosition from "ol/control/MousePosition";
import ScaleLine from "ol/control/ScaleLine";

import { transform } from "ol/proj";

/**
 * Creates a map object on a given div container.
 * @param {string} divId - The 'id' of the container for the map.
 * @returns {object} An openlayers map object
 */
export function createMap(divId) {
  var nlExtent, nlProjection, matrixIds, brtResolutions;
  nlExtent = [-285401.92, 22598.08, 595401.92, 903401.92];
  nlProjection = new Projection({
    code: "EPSG:28992",
    units: "m",
    extent: nlExtent,
    getPointResolution: (r) => {
      return r;
    },
  });
  matrixIds = new Array(15);
  for (let z = 0; z < 15; ++z) {
    matrixIds[z] = "EPSG:28992:" + z;
  }
  brtResolutions = [
    3440.64, 1720.32, 860.16, 430.08, 215.04, 107.52, 53.76, 26.88, 13.44, 6.72,
    3.36, 1.68, 0.84, 0.42, 0.21,
  ];

  var map = new Map({
    target: divId + "_div",
    view: new View({
      projection: nlProjection,
      center: [150000, 450000] /* Default coordinates for the whole country */,
      minZoom: 2,
      maxZoom: 13,
      zoom: 3,
    }),
    layers: [
      new TileLayer({
        name: "Base Map",
        source: new WMTS({
          layer: "standaard",
          url: "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0?",
          matrixSet: "EPSG:28992",
          format: "image/png",
          projection: nlProjection,
          tileGrid: new WMTSTileGrid({
            origin: getTopLeft(nlExtent),
            resolutions: brtResolutions,
            matrixIds: matrixIds,
          }),
          style: "default",
          wrapX: false,
          attributions:
            'Base Map: &copy; <a href="https://www.kadaster.nl">Kadaster</a>',
        }),
      }),
    ],
  });

  map.addControl(
    new MousePosition({
      coordinateFormat: createStringXY(1),
      className: "app-mouse-position",
    })
  );

  map.addControl(
    new ScaleLine({
      units: "metric",
    })
  );

  return map;
}
