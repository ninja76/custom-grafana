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
var arg_env  = '';
var arg_i    = 'master';
var arg_span = 4;
var arg_from = '4h';
var arg_nginx = 'no';
var arg_docker = 'no';
var arg_rabbitmq = 'no';

  if(!_.isUndefined(ARGS.span)) {
    arg_span = ARGS.span;
  }

  if(!_.isUndefined(ARGS.from)) {
    arg_from = ARGS.from;
  }

  if(!_.isUndefined(ARGS.env)) {
    arg_env = ARGS.env;
  }

  if(!_.isUndefined(ARGS.nginx)) {
    arg_nginx = ARGS.nginx;               // docker
  }

  if(!_.isUndefined(ARGS.docker)) {
    arg_docker = ARGS.docker;               // nginx
  }

  if(!_.isUndefined(ARGS.i)) {
    arg_i = ARGS.i;               // instance name
  }

  if(!_.isUndefined(ARGS.rabbitmq)) {
    arg_rabbitmq = ARGS.rabbitmq;               // instance name
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

  function panel_collectd_delta_cpu(title,prefix){
    var idx = len(prefix);
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
      stack: true,
      legend: {show: true},
      percentage: true,
      nullPointMode: "null",
      tooltip: {
        value_type: "individual",
        query_as_alias: true
      },
      targets: [
        { "target": "alias(sumSeries(" + "[[instance]].cpu.user),'user')" },
        { "target": "alias(sumSeries(" + "[[instance]].cpu.system),'system')" },
        { "target": "alias(sumSeries(" + "[[instance]].cpu.idle),'idle')" },
        { "target": "alias(sumSeries(" + "[[instance]].cpu.waiting),'wait')" },
        { "target": "alias(sumSeries(" + "[[instance]].cpu.steal),'steal')" },
      ],
      aliasColors: {
        "user": "#508642",
        "system": "#EAB839",
        "wait": "#890F02",
        "steal": "#E24D42",
        "idle": "#6ED0E0"
      }
    }
  };

  
function panel_nginx(title,prefix){
    var idx = len(prefix);
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
      stack: true,
      legend: {show: true},
      percentage: true,
      nullPointMode: "null",
      tooltip: {
        value_type: "individual",
        query_as_alias: true
      },
      targets: [
        { "target": "alias(sumSeries(" + "[[instance]].nginx.active_connections),'connections')" },
        { "target": "alias(sumSeries(" + "[[instance]].nginx.reading),'reading')" },
        { "target": "alias(sumSeries(" + "[[instance]].nginx.reading),'writing')" },
        { "target": "alias(sumSeries(" + "[[instance]].nginx.waiting),'waiting')" },
      ],
      aliasColors: {
        "writing": "#508642",
        "connections": "#EAB839",
        "reading": "#E24D42",
        "waiting": "#6ED0E0"
      }
    }
  };

  function panel_collectd_memory(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["bytes"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 1,
      linewidth: 1,
      stack: true,
      nullPointMode: "null",
      targets: [
        { "target": "alias(sumSeries(" + "[[instance]].memory.free),'free')" },
        { "target": "alias(sumSeries(" + "[[instance]].memory.buffers),'buffers')" },
        { "target": "alias(sumSeries(" + "[[instance]].memory.cache),'cache')" },
        { "target": "alias(sumSeries(" + "[[instance]].memory.swap_used),'swap_used')" },
      ],
      aliasColors: {
        "free": "#629E51",
        "swap_used": "#1F78C1",
        "cache": "#EF843C",
        "buffers": "#CCA300"
      }
    }
  };

  function panel_collectd_loadavg(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 0,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "alias(sumSeries(" + "[[instance]].load_avg.one),'1min')" },
        { "target": "alias(sumSeries(" + "[[instance]].load_avg.five),'5min')" },
        { "target": "alias(sumSeries(" + "[[instance]].load_avg.fifteen),'15min')" }
      ]
    }
  };

  function panel_collectd_cpu(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 0,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "alias(sumSeries(" + "[[instance]].cpu.idle),'idle')" },
        { "target": "alias(sumSeries(" + "[[instance]].cpu.steal),'steal')" },
        { "target": "alias(sumSeries(" + "[[instance]].cpu.system),'system')" },
        { "target": "alias(sumSeries(" + "[[instance]].cpu.user),'user')" },
        { "target": "alias(sumSeries(" + "[[instance]].cpu.waiting),'waiting')" }

      ]
    }
  };

  function panel_rabbitmq_message_rates(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 0,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "alias(sumSeries(" + "[[instance]].rabbitmq.message_stats.deliver_get.rate),'Deliver Rate')" },
        { "target": "alias(sumSeries(" + "[[instance]].rabbitmq.message_stats.publish.rate),'Publish Rate')" }
      ]
    }
  };

  function panel_rabbitmq_queue_rates(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 0,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "alias(sumSeries(" + "[[instance]].rabbitmq.queue_totals.messages_unacknowledged.rate),'Unack Rate')" },
        { "target": "alias(sumSeries(" + "[[instance]].rabbitmq.queue_totals.messages.rate),'Message Rate')" }
      ]
    }
  };

  function panel_rabbitmq_global(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 0,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "alias(sumSeries(" + "[[instance]].rabbitmq.global_counts.channels),'Channels')" },
        { "target": "alias(sumSeries(" + "[[instance]].rabbitmq.global_counts.connections),'Connections')" },
        { "target": "alias(sumSeries(" + "[[instance]].rabbitmq.global_counts.queues),'Queues')" },
        { "target": "alias(sumSeries(" + "[[instance]].rabbitmq.global_counts.consumers),'Consumers')" }
      ]
    }
  };


  function panel_docker_weather_web(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 0,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "alias(sumSeries(" + "docker." + "[[instance]].ecs-stage-weather-web.java.cpu),'cpu')" },
        { "target": "alias(sumSeries(" + "docker." + "[[instance]].ecs-stage-weather-web.java.cpu),'pctmem')" }
      ]
    }
  };

  function panel_docker_core_web(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 0,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "alias(sumSeries(" + "docker." + "[[instance]].ecs-stage-core-web.java.cpu),'cpu')" },
        { "target": "alias(sumSeries(" + "docker." + "[[instance]].ecs-stage-core-web.java.cpu),'pctmem')" }
      ]
    }
  };


  function panel_collectd_df(title,prefix,vol){
    vol = (typeof vol === "undefined") ? 'root' : vol;
    var idx = len(prefix);
    return {
      title: title + ', ' + vol,
      type: 'graphite',
      span: arg_span,
      y_formats: ["bytes"],
      grid: {max: null, min: 0, leftMin: 0},
      lines: true,
      fill: 1,
      linewidth: 2,
      stack: true,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(" + prefix + "[[instance]].df." + vol + ".df_complex.{free,used,reserved}," +(idx+3)+ ")" },
      ],
      aliasColors: {
        "used": "#447EBC",
        "free": "#508642",
        "reserved": "#EAB839"
      }
    }
  };

  function panel_collectd_disk(title,prefix,vol){
    vol = (typeof vol === "undefined") ? 'sda' : vol;
    var idx = len(prefix);
    return {
      title: title + ', ' + vol,
      type: 'graphite',
      span: arg_span,
      y_formats: ["none"],
      grid: {max: null, min: null},
      lines: true,
      fill: 1,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(nonNegativeDerivative(" + prefix + "[[instance]].disk." + vol + ".disk_ops.write,10)," +(idx+2)+ "," +(idx+4)+ ")" },
        { "target": "aliasByNode(scale(nonNegativeDerivative(" + prefix + "[[instance]].disk." + vol + ".disk_ops.read,10),-1)," +(idx+2)+ "," +(idx+4)+ ")" }
      ],
      aliasColors: {
        "write": "#447EBC",
        "read": "#508642",
      }
    }
  };

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

  function row_cpu_memory(title,prefix){
    return {
      title: title,
      height: '250px',
      collapse: false,
      panels: [
        panel_collectd_delta_cpu('CPU, %',prefix),
        panel_collectd_memory('Memory',prefix),
        panel_collectd_loadavg('Load avg, 10min',prefix)
    
      ]
    }
  };

  function row_docker_stats(title,prefix){
    return {
      title: title,
      height: '250px',
      collapse: false,
      panels: [
        panel_docker_weather_web('weather web service container',prefix),
        panel_docker_core_web('core web service container',prefix)
      ]
    }
  };

  function row_nginx_stats(title,prefix){
    return {
      title: title,
      height: '250px',
      collapse: true,
      panels: [
        panel_nginx('Nginx Stats',prefix)
      ]
    }
  };

  function row_rabbitmq_stats(title,prefix){
    return {
      title: title,
      height: '250px',
      collapse: true,
      panels: [
        panel_rabbitmq_message_rates('Message Rates',prefix),
        panel_rabbitmq_queue_rates('Queue Rates',prefix),
        panel_rabbitmq_global('Global Stats',prefix)
      ]
    }
  };

  function row_swap(title,prefix){
    return {
      title: title,
      height: '250px',
      collapse: true,
      panels: [
        panel_collectd_swap_size('Swap size',prefix),
        panel_collectd_swap_io('Swap IO',prefix),
      ]
    }
  };

  function row_network(title,prefix,filter){
    var interfaces = find_filter_values(filter + '.interface.*');
    var panels_network = [];
    for (var i in interfaces) {
      panels_network.push(
                          panel_collectd_network_octets('network octets',prefix,interfaces[i]),
                          panel_collectd_network_packets('network packets',prefix,interfaces[i])
                        );
    };
    return {
      title: title,
      height: '250px',
      collapse: true,
      panels: panels_network
    }
  };

  function row_disk_space(title,prefix,filter){
    var volumes = find_filter_values(filter + '.df.*');
    panels_disk_space = [];
    for (var i in volumes) {
      panels_disk_space.push(panel_collectd_df('disk space',prefix,volumes[i]));
    };
    return {
      title: title,
      height: '250px',
      collapse: true,
      panels: panels_disk_space
    }
  };

  function row_disk_usage(title,prefix,filter){
    var volumes = find_filter_values(filter + '.disk.*');
    var panels_disk_usage = [];
    for (var i in volumes) {
      panels_disk_usage.push(panel_collectd_disk('disk ops read/write',prefix,volumes[i]));
    };
    return {
      title: title,
      height: '250px',
      collapse: true,
      panels: panels_disk_usage
    }
  };

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
                      row_cpu_memory('cpu, memory',prefix)
                      //row_swap('swap',prefix),
                      //row_network('network',prefix,arg_filter),
                      //row_disk_space('disk space',prefix,arg_filter),
                      //row_disk_usage('disk ops',prefix,arg_filter)
                    );
    if (arg_i.indexOf("rabbit") > -1) {
	dashboard.rows.push(row_rabbitmq_stats('rabbitmq stats',prefix));
    }

    if (arg_i.indexOf("stage-ecs-") > -1) {
        dashboard.rows.push(
                        row_docker_stats('docker stats',prefix)
        );
    };

    if (arg_i.indexOf("-Router-") > -1 ){
	dashboard.rows.push(
			row_nginx_stats('nginx stats',prefix)
	);
    };

    // custom rows
    for (var i in optional_rows){
      dashboard.rows.push(optional_rows[i]);
    };

    // when dashboard is composed call the callback
    // function and pass the dashboard
    callback(dashboard);
  });
}
