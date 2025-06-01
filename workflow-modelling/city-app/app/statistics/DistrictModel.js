/*--- Districts Model ---*/

const Districts = new webix.DataCollection({
  datatype: "json",
});

/**
 * Retrieve statistical data form the server
 * @param {string} cityName - The name of the city to be used as a filter for the service.
 * @returns {json} A JSON object with population and landuse records.
 */
export function getDistricts(cityName) {
  return Districts.load(() => {
    return webix
      .ajax()
      .headers({
        "Content-Type": "application/graphql",
      })
      .post(
        "http://localhost:5000/graphql",
        `mutation {
                s3381730GetStats(input: {cityName: "${cityName}"}){
                    results{
                        code
                        label
                        name
                        pop2020
                        areaKm2
                        landuse2012
                    }
                }
            }`
      )
      .then(function (response) {
        let data = response.json()["data"]["s3381730GetStats"]["results"];
        for (let i = 0; i < data.length; i++) {
          let temp = data[i].landuse2012;
          temp = temp.replaceAll("f1", "group");
          temp = temp.replaceAll("f2", "m2");
          temp = temp.replaceAll("f3", "pct");
          data[i].landuse2012 = JSON.parse(temp);
        }
        return data;
      });
  });
}
