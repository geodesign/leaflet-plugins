/*
 Copyright (c) 2012, Bjorn Sandvik
 Choropleth plugin for Leaflet powered maps.
 https://github.com/turban/leaflet-plugins
*/
L.Choropleth = L.GeoJSON.extend({

  // Default options
  options: {
    name: undefined, 
    key: 'value',
    values: null,
    numDecimals: 0,
    classification: 'equal',
    numClasses: 6,
    classBreaks: null,
    noDataValue: undefined,
    noDataColor: 'CCC',
    noDataLabel: 'No data', 
    unit: null,   
    colors: {
      3: ['FEE8C8','FDBB84','E34A33'],
      4: ['FEF0D9','FDCC8A','FC8D59','D7301F'],   
      5: ['FEF0D9','FDCC8A','FC8D59','E34A33','B30000'],   
      6: ['FEF0D9','FDD49E','FDBB84','FC8D59','E34A33','B30000'],
      7: ['FEF0D9','FDD49E','FDBB84','FC8D59','EF6548','D7301F','990000'],   
      8: ['FFF7EC','FEE8C8','FDD49E','FDBB84','FC8D59','EF6548','D7301F','990000'],   
      9: ['FFF7EC','FEE8C8','FDD49E','FDBB84','FC8D59','EF6548','D7301F','B30000','7F0000']
    },
    normalStyle: {
      weight: 0.5,
      opacity: 1,
      color: '#000',
      fillOpacity: 1      
    },
    highlightStyle: {
      weight: 2
    },
    featureLabel: function(feature) {
      var value = feature.properties[this.key] + ((this.unit) ? ' ' + this.unit : '');
      if (value === this.noDataValue) {
        value = this.noDataLabel;  
      }
      return '<strong>' + feature.properties.name + '</strong><br/>' + value
    }
  },

  initialize: function (geojson, options) {
    options = L.Util.setOptions(this, options);
    options.style = options.style || L.Util.bind(this._getStyle, this);
    options.values = (options.data) ? this._addData(geojson, options.data) : this._getValues(geojson);
    options.classBreaks = options.classBreaks || this['_' + options.classification](options);

    if (!this._isArray(options.colors)) {
      options.colors = options.colors[options.numClasses];
    }


    this._layers = {};

    this.on({
      mouseover: this._highlightFeature, 
      mouseout: this._resetHighlight
    });

    this.addData(geojson);
  },

  // When layer added
  onAdd: function (map) {
    this._map = map;
    this.eachLayer(map.addLayer, map);
    this._addLegend(); 
  },

  // When layer removed
  onRemove: function (map) {
    this.eachLayer(map.removeLayer, map);
    this._map = null;
    this._legend.removeFrom(map); 
  },

  _addData: function (geojson, data) {
    var values = [], options = this.options;

    for (var i = 0; i < geojson.features.length; i++) {
      var feature = geojson.features[i],
          id = (options.id) ? feature.properties[options.id] : feature.id,
          value = data[id];

      if (typeof value !== 'undefined') {
        feature.properties.value = value;
        values.push(value);  
      } else {
        feature.properties.value = null;
      }
    }

    // Return sorted array
    return values.sort(function(a, b){ return a-b });
  },

  // Extract values form GeoJSON
  _getValues: function (geojson) {
    var values = [], options = this.options;

    for (var i = 0; i < geojson.features.length; i++) {
      var value = geojson.features[i].properties[options.key];
      if (value !== options.noDataValue) {
        values.push(value);  
      }
    }

    // Return sorted array
    return values.sort(function(a, b){ return a-b });
  },

  // Returns the class index where a value belongs.
  _getClass: function (value) {
    var classBreaks = this.options.classBreaks;
    for (i = 0; i < classBreaks.length - 1; i++) {
      if (value >= classBreaks[i] && value < classBreaks[i + 1]) {
        return i;
      } else if (value == classBreaks[i + 1]){ // Exception for highest value
        return i;          
      }
    };
  },  

  // Calculate class breaks - equal intervals
  _equal: function (options) {
    var values = options.values;
    var numClasses = options.numClasses;    

    var breaks = [], 
        minValue = values[0], 
        maxValue = values[values.length-1],
        interval = (maxValue - minValue) / numClasses;

    for (var i = 0; i < numClasses; i++) {
      breaks.push( parseFloat((minValue + (interval * i)).toFixed(options.numDecimals)) );
    };  
    
    breaks.push( maxValue ); // Last class break = biggest value
    return breaks;
  },

  // Calculate class breaks - quantiles
  _quantiles: function (options) {
    var values = options.values;
    var numClasses = options.numClasses;

    var breaks = [],
        classNumber = values.length / numClasses; // Number in each class
    
    for (i = 0; i < numClasses; i++) {
      breaks.push( values[parseInt(classNumber * i)] );
    };
        
    breaks.push( values[values.length - 1] );  // Last class break = biggest value
    return breaks;
  },

  _addLegend: function() {
    this._legend = L.control({position: 'bottomright'});
    this._legend.onAdd = L.Util.bind(this._createLegend, this);
    this._legend.addTo(this._map);
  },

  _createLegend: function(map) {
    var div = L.DomUtil.create('div', 'leaflet-legend'),
        options = this.options,
        breaks = options.classBreaks,
        html = '';

    if (options.name) {
      html += '<h4>' + options.name + '</h4>';
    }    
    for (var i = 0; i < breaks.length - 1; i++) {
      html += '<i style="background:#' +  options.colors[i] + '"></i> ' + breaks[i] + ' &ndash; ' + breaks[i + 1] + '<br>';
    }
    if (typeof options.noDataValue !== 'undefined') {
      html += '<i style="background:#' +  options.noDataColor + '"></i> ' + options.noDataLabel + '<br>';
    }
    div.innerHTML = html;
    return div;
  },

  // Returns feature style
  _getStyle: function(feature) {
    var options = this.options,
        value = feature.properties[options.key],
        color = options.colors[this._getClass(value)],
        style = options.normalStyle;

    style.fillColor = '#' + (color || options.noDataColor);
    return style;
  },

  // mouseover handler
  _highlightFeature: function(e) {
    e.layer.setStyle(this.options.highlightStyle);
    if (!L.Browser.ie && !L.Browser.opera) {
      e.layer.bringToFront();
    }
  },

  // mouseout handler
  _resetHighlight: function(e) {
    this.resetStyle(e.layer);
  },

  _isArray: function(input){
    return typeof input == 'object' && input instanceof Array;
  }  

});

L.choropleth = function (geojson, options) {
  return new L.Choropleth(geojson, options);
};