/**
 *  --- Home View ---
 */

import { HomeCtrl } from "./HomeController.js";
import { StatsView } from "../statistics/StatisticsView.js";

export const HomeView = {
  type: "space",
  cols: [
    {
      view: "tabview",
      id: "home-view",
      tabbar: {
        optionWidth: 150,
        on: {
          onAfterRender: HomeCtrl.onViewReady,
        },
      },
      cells: [
        {
          header: "Statistics",
          body: StatsView,
        },
      ],
    },
  ],
  getController: () => {
    return HomeCtrl;
  },
};
