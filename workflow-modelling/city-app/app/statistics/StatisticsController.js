/*--- Statistics controller ---*/
import { createMap } from "../tools.js";
import { getDistricts } from "./DistrictModel.js";
import { getColorSet } from "./ColorModel.js";

import TileLayer from "ol/layer/Tile";
import TileWMS from "ol/source/TileWMS";

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Select from "ol/interaction/Select.js";
import { pointerMove } from "ol/events/condition";
import * as olStyle from "ol/style";
import { asArray } from "ol/color.js";
import { ChoroplethLegend, DistrictList } from "./ViewWindow.js";

import * as d3 from "d3";

export let StatsCtrl = {
  navMap: null,
  district: null,
  barChart: null,
  pieChart: null,
  cityDistricts: null,
  activeFeatures: null,
  userEvent: true,
  defaultStyle: null,
  populationBars: null,

  /*- View initialization function -*/
  onViewReady: function () {
    let mapPanel = webix.$$("sts_map");
    mapPanel.getNode().innerHTML =
      '<div class="nav_map" id="' + mapPanel.config.id + '_div"></div>';
    this.navMap = createMap(mapPanel.config.id);
    console.log("Map element created!!!");

    this.navMap.getView().setCenter(appdata.cityCoords);
    this.navMap.getView().setZoom(appdata.zoom);

    this.navMap.addLayer(
      new TileLayer({
        name: "District Boundaries",
        source: new TileWMS({
          url: appdata.baseUrl,
          params: {
            MAP: appdata?.mapfile,
            LAYERS: "district",
            SERVER: "MapServer",
            TILED: true,
          },
        }),
        visible: true,
      })
    );

    this.defaultStyle = new olStyle.Style({
      stroke: new olStyle.Stroke({
        color: "#7835ff",
        width: 1,
      }),
      fill: new olStyle.Fill({
        color: "rgba(0, 0, 0, 0.1)",
      }),
    });

    this.cityDistricts = new VectorLayer({
      name: appdata.cityName + " Districts",
      source: new VectorSource({
        format: new GeoJSON(),
        url:
          appdata.wfsUrl +
          "&typename=cbs:district&CITYNAME=" +
          appdata.cityName,
      }),
      style: this.defaultStyle,
    });
    this.navMap.addLayer(this.cityDistricts);

    function activeFeatureStyle() {
      return function (feature) {
        return new olStyle.Style({
          stroke: new olStyle.Stroke({
            color: "#777",
            width: 2,
          }),
          fill: new olStyle.Fill({
            color: "rgba(0, 0, 0, 0.25)",
          }),
          text: new olStyle.Text({
            textAlign: "center",
            textBaseline: "middle",
            font: "Bold 15px Arial",
            overflow: true,
            text:
              feature.get("district_code").substring(6, 8) +
              " - " +
              feature.get("district_name"),
            fill: new olStyle.Fill({ color: "#000" }),
            stroke: new olStyle.Stroke({ color: "#fff", width: 3 }),
            rotation: 0,
          }),
        });
      };
    }

    this.activeFeatures = new Select({
      layers: [this.cityDistricts],
      condition: pointerMove,
      style: activeFeatureStyle(),
    });
    this.navMap.addInteraction(this.activeFeatures);

    webix.event("sts_map_div", "mouseout", () => {
      StatsCtrl.activeFeatures.getFeatures().clear();
    });

    this.activeFeatures.getFeatures().on("add", function (evt) {
      if (StatsCtrl.userEvent) {
        d3.select("#bar_" + evt.element.get("district_code"))
          .style("stroke", "#222")
          .style("stroke-width", 2)
          .style("fill-opacity", 0.9);

        var record = StatsCtrl.district.find(function (rec) {
          return rec.code == evt.element.get("district_code");
        });
        StatsCtrl.redrawPieChart(record.landuse2012, record.name);
      }
    });

    this.activeFeatures.getFeatures().on("remove", function (evt) {
      if (StatsCtrl.userEvent) {
        d3.select("#bar_" + evt.element.get("district_code"))
          .style("stroke", "#AAA")
          .style("stroke-width", 1)
          .style("fill-opacity", 0.4);

        StatsCtrl.redrawPieChart(
          StatsCtrl.pieChart.cityTotals,
          appdata.cityName
        );
      }
    });

    getDistricts(appdata.cityName).then(
      (response) => {
        StatsCtrl.district = response || [];
        StatsCtrl.drawPieLegend("sts_pielegend");
        StatsCtrl.drawBarChart("sts_barchart");
        StatsCtrl.drawPieChart("sts_piechart");
        StatsCtrl.populateDistrictList();

        webix.event(window, "resize", () => {
          StatsCtrl.resizeBarChart();
        });
      },
      (error) => {
        console.log(error);
      }
    );
  },

  /**
   * Redraw the bar chart when the browser window is resized.
   */
  resizeBarChart: function () {
    if (this.barChart) {
      var bc = this.barChart;

      bc.width = bc.panel.$width - bc.margin.left - bc.margin.right - 1;
      bc.height = bc.panel.$height - bc.margin.top - bc.margin.bottom;

      d3.select("svg#bar_chart").attr("width", bc.panel.$width);

      bc.x.range([0, bc.width]).padding(0.1);

      bc.obj
        .selectAll(".x.axis")
        .attr("transform", "translate(0," + bc.height + ")")
        .call(d3.axisBottom(bc.x))
        .select("#bc_xaxis_label")
        .attr("x", bc.width / 2);

      bc.obj
        .selectAll(".bar")
        .attr("x", function (r) {
          return bc.x(r.label);
        })
        .attr("width", bc.x.bandwidth() * 0.8);
    }
  },

  /**
   * Generate the content of the district list window.
   */
  populateDistrictList: function () {
    let listObject =
      '<div style="line-height:1.8;"><b>District Names</b></div>';
    StatsCtrl.district.forEach(function (record) {
      listObject +=
        '<div><span class="district_txt"><b>' +
        record.label +
        ":</b> " +
        record.name +
        "</span></div>";
    });
    DistrictList.getBody().setHTML(listObject);

    /* compute the optimal width for the window */
    DistrictList.show();
    const label = Array.from(document.getElementsByClassName("district_txt"));
    let listWidth = 0;
    label.forEach((item) => {
      listWidth = listWidth > item.offsetWidth ? listWidth : item.offsetWidth;
    });
    listWidth = listWidth > 85 ? listWidth : 86;

    DistrictList.define("width", listWidth + 26);
    DistrictList.define("height", (StatsCtrl.district.length + 1) * 14.5 + 20);
    DistrictList.resize();
    DistrictList.hide();
  },

  /**
   * Render the pie chart legend
   * @param {string} targetPanel - The 'id' of the HTML element that will contain the legend object.
   */
  drawPieLegend: function (targetPanel) {
    var lg = new Object();
    lg.panel = webix.$$(targetPanel);
    lg.panel.$view.innerHTML =
      '<div class="pie_legend" id="' + lg.panel.config.id + '_div"></div>';

    lg.width = lg.panel.$width;
    lg.height = lg.panel.$height;

    /* Legend object */
    lg.obj = d3
      .select("#" + lg.panel.config.id + "_div")
      .append("svg")
      .attr("id", "pie_legend")
      .attr("width", lg.width)
      .attr("height", lg.height);

    /* Get the data on landuse classes and use it to create the legend */
    d3.json("http://localhost:5000/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
                    mutation {
                        getLanduseClasses(input: {maxCode: 10}) {
                            results {
                            code
                            name
                            }
                        }
                    }
                `,
      }),
    })
      .then((landuseClasses) => {
        console.log("landuse-classes: ", landuseClasses);

        /* Extract data from response object */
        landuseClasses = landuseClasses["data"]["getLanduseClasses"]["results"];

        /* Define row sizes and margin for the legend items */
        var square = 28; /* size of the color squares */
        var top = (lg.height - square * (landuseClasses.length - 1)) * 0.6;

        /* Containers for each legend item */
        lg.obj
          .selectAll(".legend-element")
          .data(landuseClasses)
          .enter()
          .append("g")
          .attr("id", function (r) {
            return r.code;
          })
          .attr("class", "legend-element")
          .attr("transform", function (r, i) {
            var x = 5;
            var y = i * square + top;
            return "translate(" + x + "," + y + ")";
          });

        /* Color squares */
        lg.obj
          .selectAll(".legend-element")
          .append("rect")
          .attr("width", square / 2)
          .attr("height", square / 2)
          .style("fill-opacity", 0.6)
          .style("fill", function (r) {
            return getColorSet(r.code).fill;
          })
          .style("stroke", function (r) {
            return getColorSet(r.code).stroke;
          });

        /* Legend labels */
        lg.obj
          .selectAll(".legend-element")
          .append("text")
          .attr("x", 20)
          .attr("y", 12)
          .style("font-weight", 400)
          .text(function (r) {
            return r.name;
          });

        /* Legend title */
        lg.obj
          .append("text")
          .attr("x", 5)
          .attr("y", top - 15)
          .style("font-size", "13px")
          .style("font-weight", "500")
          .style("text-anchor", "start")
          .text("Landuse Classes");
      })
      .catch((error) => {
        console.error(error);
      });
  },

  /**
   * Display a choropleth for the provided values of a landuse group.
   * @param {object} choroData - Landuse data values of a district.
   * @param {string} group - Group identifier to use in the selection of shades for the chroropleth.
   */
  showChoropleth: function (choroData, group) {
    var choroClass, choroStyle, strokeColor, tintNumber, rgb, fillColor;
    choroClass = d3
      .scaleLinear()
      .domain([
        d3.min(choroData, function (r) {
          return r.pct;
        }),
        d3.max(choroData, function (r) {
          return r.pct;
        }),
      ])
      .rangeRound([0, 3]);
    strokeColor = getColorSet(group).stroke;

    DistrictList.show($$("sts_barchart").getNode(), {
      pos: "top",
      x: $$("sts_map").$width - DistrictList.$width - 5,
      y: -8,
    });

    ChoroplethLegend.show($$("sts_map").getNode(), {
      pos: "bottom",
      x: 5,
      y: -110,
    });

    let limits = [
      Math.round(choroClass.domain()[0]),
      Math.round(choroClass.domain()[1]),
    ];
    ChoroplethLegend.getBody().setHTML(
      '<div id="choropleth_legend_div">' +
        '<span style="line-height: 1.6; text-align:center; display:block">' +
        "<b>Hectares in 2021</b><br/></span>" +
        limits[0] +
        '<span style="float:right;">' +
        limits[1] +
        "&nbsp;</span>" +
        "</div>"
    );

    let legendObject = d3.select("#choropleth_legend_div").append("svg");
    for (let i = 0; i <= 3; i++) {
      legendObject
        .append("rect")
        .attr("x", i * 30)
        .attr("height", 12)
        .attr("width", 30)
        .attr("fill", getColorSet(group).tints[i]);
    }

    choroStyle = function () {
      return function (feature, resolution) {
        tintNumber = choroClass(
          choroData.find(function (r) {
            return r.code == feature.get("district_code");
          }).pct
        );
        rgb = asArray(getColorSet(group).tints[tintNumber]);
        fillColor = "rgba(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ", 0.8)";
        return new olStyle.Style({
          fill: new olStyle.Fill({
            color: fillColor,
          }),
          stroke: new olStyle.Stroke({
            color: strokeColor,
            width: 2,
          }),
          text: new olStyle.Text({
            textAlign: "center",
            textBaseline: "middle",
            font: "Normal 16px Arial",
            overflow: true,
            text: feature.get("district_code").substring(6),
            fill: new olStyle.Fill({ color: "#fff" }),
            stroke: new olStyle.Stroke({ color: strokeColor, width: 3 }),
            rotation: 0,
          }),
        });
      };
    };
    this.cityDistricts.setStyle(choroStyle());
  },

  /**
   * Draw new bars based on a given set of landuse values.
   * @param {object} barsData - Landuse values of a given type for all districts.
   * @param {string} fillColor - The tint value to use for the bars.
   * @param {string} strokeColor - The color for the borders of the bars.
   * @param {string} yAxisLabel - The title to use the bar chart while displaying landuse data.
   */
  redrawBars: function (barsData, fillColor, strokeColor, yAxisLabel) {
    console.log(yAxisLabel);

    var bc = this.barChart;
    bc.y.domain([
      0,
      d3.max(barsData, function (r) {
        return StatsCtrl.populationBars ? r.pop2020 : r.m2 / 10000;
      }),
    ]);

    bc.obj
      .selectAll(".bar")
      .data(barsData)
      .transition()
      .duration(200)
      .attr("y", function (r) {
        return bc.y(StatsCtrl.populationBars ? r.pop2020 : r.m2 / 10000);
      })
      .attr("height", function (r) {
        return (
          bc.height - bc.y(StatsCtrl.populationBars ? r.pop2020 : r.m2 / 10000)
        );
      })
      .style("stroke", strokeColor)
      .style("fill", fillColor);

    bc.obj.selectAll(".y.axis").call(d3.axisLeft(bc.y));

    bc.obj.select("#bc_yaxis_label").text(yAxisLabel);
  },

  /**
   * Create a pie chart using districts landuse values.
   * @param {string} targetPanel - The 'id' of the HTML element that will contain the pie chart.
   */
  drawPieChart: function (targetPanel) {
    /*---*/
    function onMouseoverPie(event, slice) {
      console.log(slice);

      var className, choroData;

      d3.selectAll(".legend-element").style("opacity", function (r) {
        if (r.code == slice.data.group) {
          className = r.name;
        }
        return r.code == slice.data.group ? 1 : 0.2;
      });

      choroData = StatsCtrl.district.map(function (r) {
        return {
          code: r.code,
          pct: r.landuse2012.find(function (g) {
            return g.group == slice.data.group;
          }).pct,
          m2: r.landuse2012.find(function (g) {
            return g.group == slice.data.group;
          }).m2,
        };
      });
      console.log(choroData);

      StatsCtrl.showChoropleth(choroData, slice.data.group, className);
      StatsCtrl.populationBars = false;
      StatsCtrl.redrawBars(
        choroData,
        getColorSet(slice.data.group).fill,
        getColorSet(slice.data.group).stroke,
        "Area covered by (" + className + ") in Hectares"
      );
    }

    function onMouseoutOfPie() {
      console.log("left the slice");

      d3.selectAll(".legend-element").style("opacity", 1);
      StatsCtrl.cityDistricts.setStyle(StatsCtrl.defaultStyle);
      StatsCtrl.populationBars = true;
      StatsCtrl.redrawBars(
        StatsCtrl.district,
        "#caccce",
        "#aaa",
        "Number of Inhabitants (2020)"
      );

      ChoroplethLegend.hide();

      DistrictList.hide();
    }
    /*---*/

    var pc = new Object();
    pc.panel = webix.$$(targetPanel);
    pc.panel.$view.innerHTML =
      '<div class="pie_chart" id="' + pc.panel.config.id + '_div"></div>';

    /* Compute statistics per landuse class at the municipality level */
    var groupArea, groupKeys, totalArea;
    groupKeys = this.district[0].landuse2012
      .map(function (r) {
        return r.group;
      })
      .sort();
    (totalArea = d3.sum(this.district, function (r) {
      return r.areaKm2 * 1000000;
    })),
      (pc.cityTotals = groupKeys.map(function (key) {
        groupArea = d3.sum(StatsCtrl.district, function (r) {
          return r.landuse2012.find(function (i) {
            return i.group == key;
          }).m2;
        });
        return {
          group: key,
          m2: groupArea,
          pct: Math.round((groupArea / totalArea) * 100),
        };
      }));

    /* Pie chart margins and dimensions */
    pc.width = pc.panel.$width;
    pc.height = pc.panel.$height;
    pc.radius = Math.min(pc.width, pc.height) / 2;

    /* Pie chart object */
    pc.obj = d3
      .select("#" + pc.panel.config.id + "_div")
      .append("svg")
      .attr("width", pc.width)
      .attr("height", pc.height)
      .attr("id", "pie_chart")
      .append("g")
      .attr(
        "transform",
        "translate(" + pc.width / 2 + "," + (pc.height / 2 - 10) + ")"
      );

    /* Arc & slice functions */
    pc.arc = d3
      .arc()
      .outerRadius(pc.radius - 45)
      .innerRadius(0);
    pc.slice = d3
      .pie()
      .sort(null)
      .value(function (r) {
        return r.m2;
      });

    /* Pie slices */
    pc.obj
      .selectAll("path")
      .data(pc.slice(pc.cityTotals))
      .enter()
      .append("path")
      .attr("id", function (r) {
        return "pie_" + r.data.group;
      })
      .attr("d", pc.arc)
      .style("fill-opacity", 0.6)
      .style("fill", function (r) {
        return getColorSet(r.data.group).fill;
      })
      .style("stroke", "#888")
      .style("stroke-width", 0.5)
      .on("mouseover", onMouseoverPie)
      .on("mouseout", onMouseoutOfPie);

    /* Labels for the various pie slices */
    pc.labelArc = d3
      .arc()
      .outerRadius(pc.radius + 90)
      .innerRadius(0);

    pc.labelAngle = function (r) {
      var a = ((r.startAngle + r.endAngle) * 90) / Math.PI - 90;
      return a > 90 ? a - 180 : a;
    };

    pc.obj
      .selectAll(".pie-label")
      .data(pc.slice(pc.cityTotals))
      .enter()
      .append("text")
      .attr("class", "pie-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("transform", function (r) {
        return (
          "translate(" +
          pc.labelArc.centroid(r) +
          ")rotate(" +
          pc.labelAngle(r) +
          ")"
        );
      })
      .text(function (r) {
        return r.data.pct > 0.9 ? r.data.pct + "%" : "";
      });

    /* Pie Title */
    pc.obj
      .append("text")
      .attr("id", "pie_title")
      .attr("x", 0)
      .attr("y", 147)
      .style("font-size", "13px")
      .style("text-anchor", "middle")
      .text("Landuse - " + appdata.cityName + " (2012)");

    /* Animation function */
    pc.sliceTween = function (r) {
      var i = d3.interpolate(this._current, r);
      this._current = i(0);
      return function (t) {
        return pc.arc(i(t));
      };
    };

    this.pieChart = pc;
  },

  /**
   * Redraws the pie chart with landuse data of a selected district or of the whole city
   * @param {object} pieData - Landuse values for a single district.
   * @param {string} districtName - Full name of the corresponding district
   */
  redrawPieChart: function (pieData, districtName) {
    console.log(pieData);

    var pc = this.pieChart;
    pc.obj
      .selectAll("path")
      .data(pc.slice(pieData))
      .transition()
      .duration(200)
      .attrTween("d", pc.sliceTween);

    pc.obj
      .selectAll(".pie-label")
      .data(pc.slice(pieData))
      .transition()
      .duration(200)
      .attr("transform", function (r) {
        return (
          "translate(" +
          pc.labelArc.centroid(r) +
          ")rotate(" +
          pc.labelAngle(r) +
          ")"
        );
      })
      .text(function (r) {
        return !r.data.m2
          ? ""
          : r.data.pct > 0.9
          ? Math.round(r.data.pct) + "%"
          : r.data.pct > 0.4
          ? "<1%"
          : "";
      });

    pc.obj
      .select("#pie_title")
      .text("Landuse in : " + districtName + " (2012)");
  },

  /**
   * Draws a population bar chart after the data of the districts has been received.
   * @param {string} targetPanel - The 'id' of the HTML element that will contain the bar chart.
   */
  drawBarChart: function (targetPanel) {
    console.log("draw-bar-chart: ", this.district);

    /* Create a tooltip element */
    var barTooltip = d3
      .select("body")
      .append("div")
      .attr("id", "bar-tooltip")
      .attr("class", "tooltip");

    /*---*/
    function onMouseoverBar(event, record) {
      console.log("mouse over bar -> " + record.name);
      d3.select("#bar_" + record.code)
        .style("stroke", "#222")
        .style("stroke-width", 2)
        .style("fill-opacity", 0.9);

      StatsCtrl.redrawPieChart(record.landuse2012, record.name);

      /* Display tooltip including some record data */
      barTooltip.html(
        "<b>" +
          record.name +
          "</b><br />" +
          webix.Number.format(record.pop_2020, { decimalSize: 0 }) +
          "&nbsp;inh.<br />" +
          webix.i18n.numberFormat(record.area_km2) +
          "&nbsp;km&sup2;"
      );

      barTooltip
        .transition()
        .duration(50)
        .style("display", "block")
        .style("opacity", 0.8);

      /* Highlight the corresponding feature on the map */
      let features = StatsCtrl.cityDistricts.getSource().getFeatures();
      StatsCtrl.userEvent = false;
      StatsCtrl.activeFeatures
        .getFeatures()
        .push(
          features.find(
            (feat) => feat.getProperties().district_code === record.code
          )
        );
    }

    function onMousemoveBar(event) {
      console.log("mouse moving inside");

      /* Follow the mouse with the tooltip */
      barTooltip
        .style("top", event.clientY - 55 + "px")
        .style("left", event.clientX + 2 + "px");
    }

    function onMouseoutBar(event, record) {
      console.log("mouse out");
      d3.select("#bar_" + record.code)
        .style("stroke", "#AAA")
        .style("stroke-width", 1)
        .style("fill-opacity", 0.4);

      StatsCtrl.redrawPieChart(StatsCtrl.pieChart.cityTotals, appdata.cityName);

      /* Hide the tooltip */
      barTooltip.transition().duration(1).style("display", "none");

      /* Remove any highlighted features from the map */
      StatsCtrl.activeFeatures.getFeatures().clear();
      StatsCtrl.userEvent = false;
    }
    /*---*/

    var bc = new Object();
    bc.panel = webix.$$(targetPanel);
    bc.panel.$view.innerHTML =
      '<div class="bar_chart" id="' + bc.panel.config.id + '_div"></div>';

    /* Bar chart margins and dimentions */
    bc.margin = { top: 30, right: 20, bottom: 50, left: 60 };
    bc.width = bc.panel.$width - bc.margin.left - bc.margin.right - 1;
    bc.height = bc.panel.$height - bc.margin.top - bc.margin.bottom;

    /* Bar chart object */
    bc.obj = d3
      .select("#" + bc.panel.config.id + "_div")
      .append("svg")
      .attr("id", "bar_chart")
      .attr("width", bc.width + bc.margin.left + bc.margin.right)
      .attr("height", bc.height + bc.margin.top + bc.margin.bottom)
      .append("g")
      .attr(
        "transform",
        "translate(" + bc.margin.left + "," + bc.margin.top + ")"
      );

    /* x & y functions */
    bc.x = d3.scaleBand().rangeRound([0, bc.width]).padding(0.1);
    bc.y = d3.scaleLinear().rangeRound([bc.height, 0]);
    bc.x.domain(
      this.district
        .map(function (r) {
          return r.label;
        })
        .sort()
    );
    bc.y.domain([
      0,
      d3.max(this.district, function (r) {
        return r.pop2020;
      }) * 1.1,
    ]);

    /* Population bars */
    bc.obj
      .selectAll(".bar")
      .data(this.district)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("id", function (r) {
        return "bar_" + r.code;
      })
      .attr("x", function (r) {
        return bc.x(r.label) + (bc.x.bandwidth() * 0.2) / 2;
      })
      .attr("y", function (r) {
        return bc.y(r.pop2020);
      })
      .attr("width", bc.x.bandwidth() * 0.8)
      .attr("height", function (r) {
        return bc.height - bc.y(r.pop2020);
      })
      .attr("class", "popbar")
      .style("stroke", "#AAA")
      .style("stroke-width", 1)
      .style("fill", "#CACCCE")
      .style("fill-opacity", 0.4)
      .on("mouseover", onMouseoverBar)
      .on("mousemove", onMousemoveBar)
      .on("mouseout", onMouseoutBar);

    this.barChart = bc;

    /* x axis */
    bc.obj
      .append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + bc.height + ")")
      .call(d3.axisBottom(bc.x))
      .append("text")
      .attr("id", "bc_xaxis_label")
      .attr("x", bc.width / 2)
      .attr("y", 35)
      .style("fill", "#404040")
      .style("font-size", "13px")
      .style("font-weight", 400)
      .style("text-anchor", "middle")
      .text("District Codes - (" + appdata.cityName + ")")
      .append("text")
      .attr("id", "bc_yaxis_label")
      .attr("x", 5)
      .attr("y", -10)
      .style("fill", "#404040")
      .style("font-size", "13px")
      .style("font-weight", 400)
      .style("text-anchor", "start")
      .text("Number of Inhabitants (2020)");

    /* y axis */
    bc.obj.append("g").attr("class", "y axis").call(d3.axisLeft(bc.y));
  },
};
/*--- ---*/
