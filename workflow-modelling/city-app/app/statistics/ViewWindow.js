/**
 * Choropleth Legend Window
 */
export const ChoroplethLegend = webix.ui({
  view: "window",
  head: false,
  width: 145,
  height: 65,
  body: {
    view: "template",
    id: "choropleth_legend",
    template: "",
  },
});

/**
 * District Names Window
 */
export const DistrictList = webix.ui({
  view: "window",
  head: false,
  autofit: true,
  width: 400,
  height: 20,
  body: {
    view: "template",
    id: "district_list",
    template: "",
  },
});
