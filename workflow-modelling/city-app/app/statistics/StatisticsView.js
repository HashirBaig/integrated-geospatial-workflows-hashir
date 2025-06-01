/*--- Statistics View ---*/

import { StatsCtrl } from "./StatisticsController.js";

export const StatsView = {
  id: "statistics-view",
  rows: [
    {
      view: "template",
      id: "sts_map",
      template: "Map",
      on: {
        onAfterRender: () => {
          StatsCtrl.onViewReady();
        },
      },
    },
    {
      height: 5,
    },
    {
      height: 300,
      cols: [
        {
          view: "template",
          id: "sts_barchart",
          template: "Bar chart",
        },
        {
          width: 5,
        },
        {
          type: "clean",
          cols: [
            {
              view: "template",
              id: "sts_piechart",
              width: 300,
              template: "Pie chart",
            },
            {
              view: "template",
              id: "sts_pielegend",
              width: 200,
              template: "Pie legend",
            },
          ],
        },
      ],
    },
  ],
  getController: () => {
    return StatsCtrl;
  },
};
/* --- */
