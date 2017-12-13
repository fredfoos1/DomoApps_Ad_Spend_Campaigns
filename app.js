$(document).ready(function() {
  init_dates();
  width = $(window).width();
  $(".mainContent").width(width-260);

  $("#datepicker").on('change', function(event, data) { update_data(); });

  $("#searchbox").on('keydown', _.debounce(function(e) {
    // if (e.which == 13 && green){
    //   add_campaign();
    // }
    //else {
        update_data();
  //  }


  }, 500));

  // Hide help popup window
  $('#exit').click(function() {
	   $('#window_div').css('display', 'none');
  });
});

// Gets recent week dates that are available
function init_dates(){
  domo.get('/data/v1/dataset?fields=date&groupby=date&orderby=date descending&limit=8').then(function(data){
    start_date = data[data.length-1].date;
    end_date = data[0].date;

    $(function() {
      $("#datepicker").daterangepicker({
         datepickerOptions : {
             numberOfMonths : 2
         }
      });
    });
    $("#datepicker").daterangepicker({
       initialText : moment(start_date, "YYYY-MM-DD").format("MMM DD, YYYY") + " - " + moment(end_date, "YYYY-MM-DD").format("MMM DD, YYYY")
     });

    // show filters
    $(".filterpanel").show();

    // Init main routine
    update_data();

  });
}

// Global variables
var filter_string = "";
var selected_region = "Argentina";
var selected_dates = [];
var start_date, end_date;
var selected_metric = "";
var selected_metric_display = "";
var selected_x = "";
var selected_x_display = "";
var selected_y = "";
var selected_y_display = "";
var requested_fields = [];
var current_dataset;
var init = false;
var show = true;
var green = false;
var button_added = false;
var add_total = true;
// Conversion data objects
var x_conversion = {"Month":"month", "Week":"week", "Day of Week":"dow", "Day":"date", "Product":"product"};
var metric_conversion = {"Click through rate":"imp,clicks", "Impressions":"imp", "Clicks":"clicks", "Cost per thousand":"cpm", "Cost per click":"imp,clicks,cpm"};
var metric_chart_display = {"Click through rate":"CTR", "Impressions":"IMP", "Clicks":"CL", "Cost per thousand":"CPM", "Cost per click":"CPC"};
// Charting variables
var rows = [];
var cols = [];
var chart_df = [];
// Display variables
var dow_sorter = {
   "Sunday": 0, // << if sunday is first day of week
  "Monday": 1,
  "Tuesday": 2,
  "Wednesday": 3,
  "Thursday": 4,
  "Friday": 5,
  "Saturday": 6
//  "sunday": 7
}
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var campaigns = [];
var campaigns_display = [];

// Main routine
function update_data(){

  // Step 1 - Get Selection
  filter_string = create_filter_string();

  // Step 2 - Get Data
  domo.get(filter_string).then(function(data){
    console.log(data);

    highlight_search(data); // UI for searchbox

    if (show){
      // Step 3 - Process data
      data = process_data(data);

      // Step 4 - Display data
      create_table_title();
      create_table(data);
      create_chart(data);

      add_export_buttons();

    }
  });
}

function highlight_search(data){
  if (selected_y_display.length > 1) {
    if (data.length == 0){
      $("#searchbox").css("border-color", "#f00");
      $("#searchbox").css("box-shadow", "0 0 10px #f00");
      $("#searchbox:focus").css("box-shadow", "0 0 10px #f00");
      show = false;
      green = false;
    }
    else {
      $("#searchbox").css("border-color", "#0f0");
      $("#searchbox").css("box-shadow", "0 0 10px #0f0");
      $("#searchbox:focus").css("box-shadow", "0 0 10px #0f0");
      show = true;
      green = true;
    }
  }
  else {
    $("#searchbox").css("border-color", "rgb(230,230,230)");
    $("#searchbox").css("box-shadow", "none");
    $("#searchbox:focus").css("box-shadow", "none");
    show = true;
    green = false;
  }
}

function create_filter_string(){

  selected_region = get_selected_region();
  selected_dates = get_selected_dates();
  selected_metric_display = get_selected_metric_display();
  selected_metric = get_selected_metric();
  selected_x = get_selected_x();
  selected_x_display = get_selected_x_display();
  selected_y = get_selected_y();
  requested_fields = get_requested_fields();
  var grouped_by = get_groupedby();

  console.log("Region: " + selected_region + ", Metric: "+ selected_metric
    + ", Metric D: "+ selected_metric_display +", Dates: "+selected_dates+", X: "+selected_x+", X: "+selected_x_display);
  if (selected_metric == "imp,clicks,cpm" || selected_metric == "cpm" ) filter = "/data/v1/dataset_cpc?";
  else filter = "/data/v1/dataset?";
  filter += "fields=" + requested_fields +"";
  if (selected_region != "UMG Global") filter += "&filter=country in [" + selected_region +"],";
  else filter += "&filter=";
  //filter += ",date in [" + selected_dates +"]";
  filter += "date " + selected_dates +"";
  if (selected_y.length > 0 && campaigns.length <= 1) filter += ",item contains " + selected_y +"";
  if (selected_y.length > 0 && campaigns.length > 1) filter += ",item contains " + selected_y +"";
  filter += "&groupby=" + grouped_by;

  console.log(filter);
  return filter;
}

// Get functions for filter string
function get_selected_region(){
  r = $('#region').selectpicker('val');
  if (r == "") return "UMG Global";
  return r;
}
function get_selected_metric(){
  m = metric_conversion[$('#metric').selectpicker('val')];
  if (m == undefined) return "imp,clicks";
  return m;
}
function get_selected_metric_display(){
  m = $('#metric').selectpicker('val');
  if (m == "") return "Click through rate";
  return m;
}
function get_selected_x(){
  x = x_conversion[$('#xaxis').selectpicker('val')];
  if (x == undefined) return "date";
  return x;
}
function get_selected_x_display(){
  x = $('#xaxis').selectpicker('val');
  if (x == "") return "Day";
  return x;
}
function get_selected_dates(){
  if (!init){
    init = true;
  }
  if ($("#datepicker").daterangepicker('getRange') != null){
    start_date = moment($("#datepicker").daterangepicker('getRange').start).format('MM/DD/YYYY');
    end_date = moment($("#datepicker").daterangepicker('getRange').end).format('MM/DD/YYYY');
  }
  return ">= " + start_date + ",date <= " + end_date;
}
function get_groupedby(){
  // Group by Country, X, and Product
  gb = "";
  if (selected_region != "UMG Global") gb = "country,";
  gb += selected_x;
  gb += ",product" ;
  if (campaigns.length > 1) gb += ",item";
  if (selected_metric == "cpm") gb += "," + selected_metric;
  if (selected_metric == "imp,clicks,cpm")  gb += ",cpm" ;
  return gb;
}
function get_requested_fields(){
  // Get Product, X, and Metric from API call
  rf = ["product"];
  if (campaigns.length > 1) rf.push("item");
  rf.push(selected_x);
  rf.push(selected_metric);
  return rf;
}
function get_selected_y(){
  selected_y_display = $('#searchbox').val();
  return $('#searchbox').val().replace(/\s/g, '');
}
function get_selected_product(){
  return $('#product').selectpicker('val');
}

function flatten(arr) {
  return [].concat(...arr)
}
function deepFlatten(arr) {
  return flatten(           // return shalowly flattened array
    arr.map(x=>             // with each x in array
      Array.isArray(x)      // is x an array?
        ? deepFlatten(x)    // if yes, return deeply flattened x
        : x                 // if no, return just x
    )
  )
}

function get_data_value(){
  if (selected_metric == "imp,clicks") return ['clicks', 'imp'];
  if (selected_metric == "imp,clicks,cpm") return ['paid', 'clicks'];
  return [selected_metric];
}

function get_precision(value){
  if (selected_metric == 'imp' || selected_metric == 'clicks') return ((value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  if (selected_metric == 'imp,clicks') return ((Math.round(10000 * value) / 100).toPrecision(2) + "%");
  if (selected_metric == 'imp,clicks,cpm') return (value.toFixed(2));
  return value;
}

function create_table_title(){
  var title = selected_metric_display + " by " + selected_x_display + " in " + selected_region;
  if (selected_y != "") title += " - " + selected_y_display;
  $("#tabletitle").html(title);
  $("#charttitle").html(title);
}

function process_data(data){
  if (selected_x == "week") for (i = 0; i < data.length; i++) data[i].week = convert_week(data[i].week);
  //if (selected_x == "month") for (i = 0; i < data.length; i++) data[i].month = convert_month(data[i].month);
  if (selected_x == "date") for (i = 0; i < data.length; i++) data[i].date = convert_day(data[i].date);
  if (selected_metric == "imp,clicks,cpm"){
    data.forEach((e) => {
      e.cpc = e.imp * e.cpm / (1000 * e.clicks);
      e.paid = e.imp * e.cpm / (1000);
    });
  }
  return data;
}

function convert_month(m){
  return moment(m, 'MM').format('MMM');
}
function convert_day(d){
  return moment(d, 'YYYY-MM-DD').format('MM/DD/YYYY'); //works for sorting
}
function convert_week(w){
  w = w.toString();
  year = parseInt(w.slice(0,4));
  console.log(moment({year:year}));
  week = parseInt(w.slice(4,6));
  return moment({year:year}).add(week-1, 'weeks').startOf('week').format('MM/DD/YYYY');
}
function get_col_format(v){
  if (selected_x == "date"){
    if (start_date.slice(0,4) == end_date.slice(0,4)) return v.slice(0,5);
  }
  if (selected_x == "month") return months[v-1];
  return v;
}
function format_val(v){
  if (selected_metric == "imp,clicks") return parseFloat(v.slice(0, v.length-1));
  return v;
}

// Export button
function add_export_buttons(){
  if (button_added){
    $(".export").remove();
  }
    $('#table').each(function() {
      var $table = $(this);
        var file_name = $table.parent()[0].firstElementChild.innerText;
        var $button = $("<button class='export' type='button'>");
        $button.text("Export");
        $button.insertAfter($table);
        $button.click(function() {
          var csv = $table.table2CSV_2({filename: file_name+'.csv'});
        });
        button_added = true;
    });
}

function set_add_total(){
  if (selected_metric == "cpm") add_total = false;
  else add_total = true;
}

function format_x_axis(){
  if (selected_x == "month") return "%m";
  if (selected_x == "date") return "%m/%d";
  else return "%m/%d";
}

function show_dialog(){
	$('#window_div').css('display', 'block');
}

////////////

function makeStyleObject(rule){
  var styleDec = rule.style;
  var output = {};
  var s;

  for (s = 0; s < styleDec.length; s++) {
    output[styleDec[s]] = styleDec[styleDec[s]];
  }
  return output;
};

function export_svg(){
  //get svg element.
  var svgData = $("#chart");
  var svg = document.getElementById("chart").firstElementChild;
  svg.removeChild(svg.firstElementChild);

  //get svg source.
  var serializer = new XMLSerializer();
  var source = serializer.serializeToString(svg);

  // Add fill: none to paths (the lines)
  var index = 0;
  while (index !== -1){
    index = source.indexOf("<path class=\" ", index + 1);
    index_to_replace = source.indexOf("style=", index);
    if (index !== -1){
      before = source.substring(0,index_to_replace + 7);
      after = source.substring(index_to_replace + 7);
      source = before + "fill: none;" + after;
    }
  }
  // Add fill and stroke to axes
  index = 0;
  while (index !== -1){
    index = source.indexOf("<path class=\"domain\"", index + 1);
    if (index !== -1){
      before = source.substring(0,index + 20);
      after = source.substring(index + 20);
      source = before + " style=\"fill: none; stroke: #000;\" " + after;
    }
  }
  // Add style="stroke" to line elements (tick marks)
  index = 0;
  while (index !== -1){
    index = source.indexOf("<line y", index + 1);
    if (index == -1) index = source.indexOf("<line x", index + 1);

    if (index !== -1){
      before = source.substring(0,index + 5);
      after = source.substring(index + 5);
      source = before + " style=\"stroke: #000;\" " + after;
    }
  }
  // Add text size
  index = 0;
  while (index !== -1){
    index = source.indexOf("<text ", index + 1);
    index_to_replace = source.indexOf("style=", index);
    index_too_far = source.indexOf(">", index + 1);
    if (index !== -1 && index_to_replace !== -1 && index_to_replace < index_too_far){
      before = source.substring(0, index_to_replace + 7);
      after = source.substring(index_to_replace + 7);
      source = before + " font-family: 'Roboto';font-size: 11px; " + after;
    }
  }

  //add name spaces.
  if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }
  source = "<?xml-stylesheet href='app.css' type='text/css'?>\r\n" + source;
  source = "<?xml-stylesheet href='/c3-0.4.15/c3.css' type='text/css'?>\r\n" + source;
  //add xml declaration
  source = '<?xml version="1.0" standalone="yes"?>\r\n' + source;

  //convert svg source to URI data scheme.
  var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);
  var downloadLink = document.createElement("a");

  var svgBlob = new Blob([svg], {type:"image/svg+xml;charset=utf-8"});
  var svgUrl = URL.createObjectURL(svgBlob);

  var format = 'png';

  if (format == 'svg'){
    // Export SVG
    var downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "new.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }
  if (format == 'png'){
    // Export PNG
    svgString2Image( url, 2000, 800, 'png', save ); // Can specify width and height - scaling by 2 works nicely
  }

}

function save( dataBlob, filesize ){
	saveAs( dataBlob, 'export.png' ); // FileSaver.js function
}

function svgString2Image( svgString, width, height, format, callback ) {
	var format = format ? format : 'png';

	var imgsrc = svgString;

	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");

	canvas.width = width;
	canvas.height = height;

	var image = new Image();
	image.onload = function() {
		context.clearRect ( 0, 0, width, height );
		context.drawImage(image, 0, 0, width, height);

		canvas.toBlob( function(blob) {
			var filesize = Math.round( blob.length/1024 ) + ' KB';
			if ( callback ) callback( blob, filesize );
		});
	};
	image.src = imgsrc;
}

function add_campaign(){
  y = $('#searchbox').val();
  yd = get_selected_y();
  campaigns_display.push(y);
  campaigns.push(yd);
  display_campaigns();
}

function display_campaigns(){
  l = $("#campaigns")[0];
  l.innerHTML = ""; // reset HTML
  for (i = 0; i < campaigns.length; i++){
    if (campaigns[i].length >0) {
      l.innerHTML += "<p class=\"indiv_campaign\" id=\"campaign" + campaigns[i]
        + "\"><span>" + "<button class=\"remove_campaign\" onclick=\"remove_campaign(campaign"
        + campaigns[i] + ")\">x</button> &nbsp;" + campaigns_display[i] + "</span></p>";
      }
  }
}

function remove_campaign(c){
  // Isolate campaign string by removing 'campaign' off the front
  campaign_string = c.id.slice(8,c.id.length);

  // remove from campaigns array
  remove_from_array(campaigns, campaign_string);

  // remove from UI and update
  display_campaigns();
  update_data();
}

function remove_from_array(array, element) {
    const index = array.indexOf(element);
    if (index !== -1) {
        array.splice(index, 1);
        campaigns_display.splice(index, 1);
    }
}
