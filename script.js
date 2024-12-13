function heatPoint(coordinates, ntrip) {
    var latLng = L.latLng(coordinates[1], coordinates[0]);

    return [latLng.lat, latLng.lng, ntrip];
  }

  function standardize(time, ntrip) {
    var s = 0;
    if (time === "0:00-6:00") {
      s = ntrip / 6;
    } else if (time === "6:00-10:00") {
      s = ntrip / 4;
    } else if (time === "10:00-15:00") {
      s = ntrip / 5;
    } else if (time === "15:00-20:00") {
      s = ntrip / 5;
    } else if (time === "20:00-24:00") {
      s = ntrip / 4;
    }
    return s;
  }
  function layer_classify(heatMapTimes, time, point) {
    if (time === "0:00-6:00") {
      heatMapTimes.zero.push(point);
    } else if (time === "6:00-10:00") {
      heatMapTimes.six.push(point);
    } else if (time === "10:00-15:00") {
      heatMapTimes.ten.push(point);
    } else if (time === "15:00-20:00") {
      heatMapTimes.fifteen.push(point);
    } else if (time === "20:00-24:00") {
      heatMapTimes.twenty.push(point);
    }
  }

  function min_update(min, freq) {
    if (min > freq) {
      return freq;
    } else {
      return min;
    }
  }

  function max_update(max, freq) {
    if (max < freq) {
      return freq;
    } else {
      return max;
    }
  }

  function getColor(value, min, max) {
    var minHue = 120; // green
    var maxHue = 0; // red
    var midHue = 60; // yellow
    var mid = (min + max) / 2;

    if (value <= mid) {
      return (
        "hsl(" +
        (minHue + ((midHue - minHue) * (value - min)) / (mid - min)) +
        ", 100%, 50%)"
      );
    } else {
      return (
        "hsl(" +
        (midHue + ((maxHue - midHue) * (value - mid)) / (max - mid)) +
        ", 100%, 50%)"
      );
    }
  }

  var map = L.map("heatmap", {
    center: [49.25088, -123.052112], // EDIT latitude, longitude to re-center map
    zoom: 12, // EDIT from 1 to 18 -- decrease to zoom out, increase to zoom in
    scrollWheelZoom: false,
    tap: false,
  });

  time_0 = L.layerGroup();
  time_6 = L.layerGroup();
  time_10 = L.layerGroup();
  time_15 = L.layerGroup();
  time_20 = L.layerGroup();

  const timeWindow = {
    "0:00 - 6:00": time_0,
    "6:00 - 10:00": time_6,
    "10:00 - 15:00": time_10,
    "15:00 - 20:00": time_15,
    "20:00 - 24:00": time_20,
  };

  var controlLayers = L.control
    .layers(timeWindow, null, {
      position: "topright",
      collapsed: false,
    })
    .addTo(map);

  var light = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>',
    }
  ).addTo(map);

  $.getJSON("current_data/output.geojson", function (data) {
    var heatMapTimes = {
      zero: [],
      six: [],
      ten: [],
      fifteen: [],
      twenty: [],
    };
    var maxFreq = -Infinity;
    var minFreq = +Infinity;
    data.features.forEach((feature) => {
      var ntrip = feature.properties.ntrips;
      var time = feature.properties.window;
      var coordinates = feature.geometry.coordinates;
      var freq = standardize(time, ntrip);
      minFreq = min_update(minFreq, freq);
      maxFreq = max_update(maxFreq, freq);
      var point = heatPoint(coordinates, freq);

      layer_classify(heatMapTimes, time, point);
    });

    const heatLayerOptions = {
      radius: 9,
      minOpacity: 0.8,
      max: maxFreq,
      min: minFreq,
    };
    L.heatLayer(heatMapTimes.zero, heatLayerOptions).addTo(time_0);
    L.heatLayer(heatMapTimes.six, heatLayerOptions).addTo(time_6);
    L.heatLayer(heatMapTimes.ten, heatLayerOptions).addTo(time_10);
    L.heatLayer(heatMapTimes.fifteen, heatLayerOptions).addTo(time_15);
    L.heatLayer(heatMapTimes.twenty, heatLayerOptions).addTo(time_20);

    var legend = L.control({ position: "bottomleft" });

    legend.onAdd = function (map) {
      var div = L.DomUtil.create("div", "legend");
      var grades = [minFreq, (minFreq + maxFreq) / 2, maxFreq];
      var labels = [];
      var intervals_num = 5;
      var interval = (maxFreq - minFreq) / intervals_num;

      // loop through our density intervals and generate a label with a colored square for each interval
      for (var i = 0; i < intervals_num; i++) {
        var lowerBound = minFreq + i * interval;
        var upperBound = minFreq + (i + 1) * interval;
        div.innerHTML +=
          '<i style="background:' +
          getColor(lowerBound, minFreq, maxFreq) +
          '"></i> ' +
          lowerBound.toFixed(2) +
          "&ndash;" +
          upperBound.toFixed(2) +
          "<br>";
      }
      div.innerHTML += "Number of bus stops (per hour)";
      return div;

    };
    legend.addTo(map);
  });