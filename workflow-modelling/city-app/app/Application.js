/**
 *
 * This is the main application file.
 * The ideal place to handle any application launch settings
 *
 */

import { HomeView } from "./home/HomeView.js";

/* --- */
webix.debug({ events: true });
/* --- */

/* Global variables */
window.appdata = {
  appName: "CityApp",
  cityName: "Zwolle",
  cityCoords: [
    133500, 455200,
  ] /* Coordinates of a central point in Zwolle using EPSG:28992 */,
  zoom: 6.6,
  wfsUrl: null,
  baseUrl: "https://gisedu.itc.utwente.nl/cgi-bin/mapserv.exe?",
  mapfile: "d:/iishome/student/s3381730/cityapp/app/api/adminboundaries.map",
};

appdata.wfsUrl =
  appdata.baseUrl +
  "MAP=" +
  appdata.mapfile +
  "&SERVICE=WFS&version=1.1.0&REQUEST=GetFeature" +
  "&outputformat=geojson&srsname=EPSG:28992";
/* --- */

/* Initialization function */
webix.ready(function () {
  webix.ui(HomeView);
  document.title = appdata.cityName + " City - Information App";
});
/* --- */
