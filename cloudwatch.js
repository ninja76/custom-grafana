/* global _ */
/*
 * Complex scripted dashboard
 * This script generates a dashboard object that Grafana can load. It also takes a number of user
 * supplied URL parameters (int ARGS variable)
 *
 * Global accessable variables
 * window, document, $, jQuery, ARGS, moment
 *
 * Return a dashboard object, or a function
 *
 * For async scripts, return a function, this function must take a single callback function,
 * call this function with the dasboard object
 *
 * Author: Anatoliy Dobrosynets, Recorded Future, Inc.
 */

// accessable variables in this scope
var window, document, ARGS, $, jQuery, moment, kbn;

// use defaults for URL arguments
var arg_env  = 'RDS';
var arg_i    = 'master';
var arg_span = 4;
var arg_from = '4h';


  if(!_.isUndefined(ARGS.span)) {
    arg_span = ARGS.span;
  }

  if(!_.isUndefined(ARGS.from)) {
    arg_from = ARGS.from;
  }

  if(!_.isUndefined(ARGS.env)) {
    arg_env = ARGS.env;
  }

  if(!_.isUndefined(ARGS.i)) {
    arg_i = ARGS.i;
  }

  // return dashboard filter_list
  // optionally include 'All'
  function get_filter_object(name,query,show_all){
    show_all = (typeof show_all === "undefined") ? true : show_all;
    var arr = find_filter_values(query);
    var opts = [];
    for (var i in arr) {
      opts.push({"text":arr[i], "value":arr[i]});
    };
    if (show_all == true) {
      opts.unshift({"text":"All", "value": '{'+arr.join()+'}'});
    };
    return {
      type: "filter",
      name: name,
      query: query,
      options: opts,
      current: opts[0],
      includeAll: show_all
    }
  };

  // execute graphite-api /metrics/find query
  // return array of metric last names ( func('test.cpu-*') returns ['cpu-0','cpu-1',..] )
  function find_filter_values(query){
    
    //var search_url = window.location.protocol + '//' + window.location.hostname.replace(/^grafana/,"graphite") + (window.location.port ? ":" + window.location.port : "") + '/metrics/find/?query=' + query;
    var search_url = window.location.protocol + '//' + 'graphite.farmlogs.com' + '/metrics/find/?query=' + query;
    console.log(search_url);
    var res = [];
    var req = new XMLHttpRequest();
    req.open('GET', search_url, false);
    req.send(null);
    var obj = JSON.parse(req.responseText);
    for(var key in obj) {
      if (obj[key].hasOwnProperty("text")) {
        res.push(obj[key]["text"]);
      }
    }
    return res;
  };

  // execute graphite-api /metrics/expand query
  // return array of metric full names (func('*.cpu-*') returns ['test.cpu-0','test.cpu-1',..] )
  function expand_filter_values(query){
    //var search_url = window.location.protocol + '//' + window.location.host + '/_graphite/metrics/expand/?query=' + query;
    var search_url = window.location.protocol + '//' + 'graphite.farmlogs.com' + '/_graphite/metrics/expand/?query=' + query;
    console.log(search_url);
    
    var req = new XMLHttpRequest();
    req.open('GET', search_url, false);
    req.send(null);
    var obj = JSON.parse(req.responseText);
    if (obj.hasOwnProperty('results')) {
      return obj['results'];
    } else {
      return [];
    };
  };

  // used to calculate aliasByNode index in panel template
  function len(prefix){
    return prefix.split('.').length - 2;
  };

//---------------------------------------------------------------------------------------

  function panel_rds_cpu(title,node){
    var idx = len(node);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      renderer: "flot",
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 1,
      linewidth: 1,
      stack: false,
      legend: {show: true},
      percentage: true,
      nullPointMode: "connected",
      tooltip: {
        value_type: "individual",
        query_as_alias: true
      },
      targets: [
        { "target": "alias(sumSeries(cloudwatch.aws.rds." + node + ".cpuutilization.average.percent),'cpu')" }
      ],
       aliasColors: {
        "cpu": "#E24D42",
        "idle": "#6ED0E0"
      }
    }
  };

  function panel_rds_io(title,node){
    var idx = len(node);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      renderer: "flot",
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 1,
      linewidth: 1,
      stack: false,
      legend: {show: true},
      percentage: false,
      nullPointMode: "connected",
      tooltip: {
        value_type: "individual",
        query_as_alias: true
      },
      targets: [
        { "target": "alias(sumSeries(cloudwatch.aws.rds." + node + ".readiops.average.count.second),'read')" },
        { "target": "alias(sumSeries(cloudwatch.aws.rds." + node + ".writeiops.average.count.second),'write')" }
      ]
    }
  };

  function panel_rds_connections(title,node){
    var idx = len(node);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      renderer: "flot",
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 1,
      linewidth: 1,
      stack: false,
      legend: {show: true},
      percentage: false,
      nullPointMode: "connected",
      tooltip: {
        value_type: "individual",
        query_as_alias: true
      },
      targets: [
        { "target": "alias(sumSeries(cloudwatch.aws.rds." + node + ".databaseconnections.average.count),'connections')" }
      ],
       aliasColors: {
        "connections": "#EAB839",
        "wait": "#890F02",
        "steal": "#E24D42",
        "idle": "#6ED0E0"
      }
    }
  };

  function panel_rds_freememory(title,node){
    var idx = len(node);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      renderer: "flot",
      y_formats: ["bytes"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 1,
      linewidth: 1,
      stack: false,
      legend: {show: true},
      percentage: false,
      nullPointMode: "connected",
      tooltip: {
        value_type: "individual",
        query_as_alias: true
      },
      targets: [
        { "target": "alias(sumSeries(cloudwatch.aws.rds." + node + ".freeablememory.average.bytes),'freeable')" }
      ],
       aliasColors: {
        "freeable": "#6ED0E0"
      }
    }
  };

  function panel_rds_diskqueuedepth(title,node){
    var idx = len(node);
    return {
      title: title,
      type: 'graphite',
      span: 4,
      renderer: "flot",
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 1,
      linewidth: 1,
      stack: false,
      legend: {show: true},
      percentage: false,
      nullPointMode: "connected",
      tooltip: {
        value_type: "individual",
        query_as_alias: true
      },
      targets: [
        { "target": "alias(sumSeries(cloudwatch.aws.rds." + node + ".diskqueuedepth.average.*),'queue depth')" }
      ],
       aliasColors: {
        "queue depth": "#1EFFE0"
      }
    }
  };

  function panel_rds_swap(title,node){
    var idx = len(node);
    return {
      title: title,
      type: 'graphite',
      span: 4,
      renderer: "flot",
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 1,
      linewidth: 1,
      stack: false,
      legend: {show: true},
      percentage: false,
      nullPointMode: "connected",
      tooltip: {
        value_type: "individual",
        query_as_alias: true
      },
      targets: [
        { "target": "alias(sumSeries(cloudwatch.aws.rds." + node + ".swapusage.average.*),'swap usage')" }
      ],
       aliasColors: {
        "swap usage": "#E24DFF"
      }
    }
  };

http://www.amazon.com/dp/B00F9HAJ46?psc=1
  
  /*
    row templates
  */

  function row_delimiter(title){
    return {
      title: "_____ " + title,
      height: "20px",
      collapse: false,
      editable: false,
      collapsable: false,
      panels: [{
        title: title,
        editable: false,
        span: 12,
        type: "text",
        mode: "text"
      }]
    }
  };

  function row_rds(title,node){
    return {
      title: title,
      height: '250px',
      collapse: false,
      panels: [
        panel_rds_cpu('CPU Utiliziation', node),
        panel_rds_io('IO Operations per/s', node),
        panel_rds_connections('Connections', node)
      ]
    }
  };
   
  function row_rds_conn(title,node){
    return {
      title: title,
      height: '250px',
      collapse: false,
      panels: [
        panel_rds_freememory('Freeable Memory', node),
        panel_rds_diskqueuedepth('Disk Queue Depth', node),
        panel_rds_swap('Swap Usage', node)
      ]
    }
  }; 

  function row_rds_queue_swap(title,node){
    return {
      title: title,
      height: '250px',
      collapse: false,
      panels: [
        panel_rds_diskqueuedepth('Disk Queue Depth', node),
        panel_rds_swap('Swap Usage', node)
      ]
    }
  }
//---------------------------------------------------------------------------------------


return function(callback) {

  // Setup some variables
  var dashboard;

  /* prefix - depends on actual Graphite tree.
              In my case it depends on environment which can be passed as argument too.
      .collectd.hosts.
      .statsd.hosts.
      .jmxtrans.hosts.
  */

  //var prefix = arg_env + '.collectd.hosts.';
  var prefix = arg_env + '';

  var arg_filter = prefix + arg_i;

  // set filter
  var dashboard_filter = {
    time: {
      from: "now-" + arg_from,
      to: "now"
    },
    list: [
      get_filter_object("instance",arg_filter,false)
      ]
  };

  // define pulldowns
  pulldowns = [
    {
      type: "filtering",
      collapse: false,
      notice: false,
      enable: true
    },
    {
      type: "annotations",
      enable: false
    }
  ];

  // Intialize a skeleton with nothing but a rows array and service object

  dashboard = {
    rows : [],
    services : {}
  };
  dashboard.title = arg_i + ' (' + arg_env + ')';
  dashboard.editable = true;
  dashboard.pulldowns = pulldowns;
  dashboard.services.filter = dashboard_filter;


  // custom dashboard rows (appended to the default dashboard rows)

  var optional_rows = [];

  $.ajax({
    method: 'GET',
    url: '/'
  })
  .done(function(result) {

    // costruct dashboard rows

    dashboard.rows.push(
                      row_rds('cpu',arg_i),
                      row_rds_conn('connections',arg_i)
                    );
    // custom rows
    for (var i in optional_rows){
      dashboard.rows.push(optional_rows[i]);
    };

    // when dashboard is composed call the callback
    // function and pass the dashboard
    callback(dashboard);
  });
}
