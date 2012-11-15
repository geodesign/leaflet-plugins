L.Graticule = L.GeoJSON.extend({

  options: {
    interval: 20,
    precision: 1
  },

  initialize: function (options) {
    L.Util.setOptions(this, options);
    this._layers = {};

    if (this.options.frame) {
      this.addData(this._getFrame());
    } else {
      this.addData(this._getGraticule());      
    }

  },

  _getFrame: function() {
    return { "type": "Polygon",
      "coordinates": [
        this._getMeridian(-180).concat(this._getMeridian(180).reverse())
      ]
    };
  },

  _getGraticule: function () {

    var features = [], options = this.options;

    // Meridians
    for (var lng = 0; lng <= 180; lng = lng + options.interval) {
      features.push(this._getFeature(this._getMeridian(lng), {
        "name": lng.toString()
      }));
      if (lng !== 0) {
        features.push(this._getFeature(this._getMeridian(-lng), {
          "name": -lng.toString()
        }));    
      }
    }

    // Parallels
    for (var lat = 0; lat <= 90; lat = lat + options.interval) {  
      features.push(this._getFeature(this._getParallel(lat), {
        "name": lat.toString()
      }));
      if (lat !== 0) {
        features.push(this._getFeature(this._getParallel(-lat), {
          "name": -lat.toString()
        }));      
      }
    } 

    return {
      "type": "FeatureCollection",
      "features": features
    };

  },

  _getMeridian: function (lng) {
    lng = this._lngFix(lng);
    var coords = [];
    for (var lat = -90; lat <= 90; lat = lat + this.options.precision) {
      coords.push([lng, lat]);
    }
    return coords;
  },

  _getParallel: function (lat) {
    var coords = [];
    for (var lng = -180; lng <= 180; lng = lng + this.options.precision) {
      coords.push([this._lngFix(lng), lat]);
    }
    return coords;    
  },

  _getFeature: function (coords, prop) {
    return {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": coords,
        "properties": prop
      }
    }
  },

  _lngFix: function (lng) {
    if (lng >= 180) return 179.999999;
    if (lng <= -180) return -179.999999;
    return lng;        
  }  

});

L.graticule = function (options) {
  return new L.Graticule(options);
};