function create_table(data) {
  rows = [];
  cols = [];
  row_totals = [];
  row_totals_denominator = [];
  col_totals = [];
  col_totals_denominator = [];
  for (i=0; i<data.length; i++){
    if (rows.indexOf(data[i]["product"]) < 0) rows.push(data[i]["product"]);
    if (cols.indexOf(data[i][selected_x]) < 0) cols.push(data[i][selected_x]);
  }

  cols.sort(function(a, b){return moment(a) - moment(b);});
  if (selected_x == "dow") {
    cols.sort(function sortByDay(a, b) {
      return dow_sorter[a] > dow_sorter[b];
    });
  }

  var table_html = "<table id=\"data_table\" border=\"1px black solid\">"; // InnerHTML for the table
  var table = document.getElementById("table");
  set_add_total();

  chart_df = [[selected_x_display]];
  // Create Column Headers
  table_html = table_html + " <tr> " + "<th>" + "Product" + "</th>"; // Begin the row
  for (k = 0; k < cols.length; k++) {
    table_html = table_html + "<th>" + get_col_format(cols[k]) + "</th>";
    if (selected_x == "month") chart_df[0].push(convert_month(cols[k]));
    else chart_df[0].push(cols[k]);
  }
  if (add_total) table_html += "<th>Total</th>";
  table_html = table_html + " </tr> "; // End the row

  // Get metric calculation
  data_value = get_data_value();


  // Add rows of data + totals
  for (i = 0; i < rows.length; i++) {
    table_html = table_html + " <tr> " + "<td>" + rows[i] + "</td>"; // Begin the row
    chart_df[i + 1] = [rows[i]];
    row_totals.push([]);
    row_totals_denominator.push([]);
    for (j = 0; j < cols.length; j++){
      if (col_totals.length < cols.length){
        col_totals.push([]);
        col_totals_denominator.push([]);
      }
      added = false;
      for (k = 0; k < data.length; k++) {
        if (data[k]["product"] == rows[i] && data[k][selected_x] == cols[j]) {
          if (data_value.length == 2) {
            val = data[k][data_value[0]] / data[k][data_value[1]];
            row_totals_denominator[i].push(data[k][data_value[1]]);
            col_totals_denominator[j].push(data[k][data_value[1]]);
          }
          else val = data[k][data_value[0]];
          table_html = table_html + "<td>" + get_precision(val) + "</td>";
          if (data_value.length == 2) { chart_df[i+1].push(format_val(get_precision(val))); }
          else chart_df[i+1].push(format_val(val));
          row_totals[i].push(data[k][data_value[0]]);
          col_totals[j].push(data[k][data_value[0]]);
          added = true;
        }
      }
      if (!added) {
        table_html += "<td>-</td>";
        chart_df[i+1].push(0);
        row_totals[i].push(0);
        row_totals_denominator[i].push(0);
        col_totals[j].push(0);
        col_totals_denominator[j].push(0);
      }
    }
    if (data_value.length == 2) row_total = get_precision(row_totals[i].reduce((a,b) => a + b) / row_totals_denominator[i].reduce((a,b) => a + b));
    else row_total = get_precision(row_totals[i].reduce((a,b) => a + b));
    if (add_total) table_html +=  "<td class='row_total'>" + row_total + "</td>" ; // End the row
    table_html += " </tr> ";
  }

  // Add column totals
  if (add_total){
    table_html += "<tr class='col_total'><td>Total</td>";
    for (i = 0; i < cols.length; i++){
      if (data_value.length == 2) col_total = get_precision(col_totals[i].reduce((a,b) => a + b) / col_totals_denominator[i].reduce((a,b) => a + b));
      else col_total = get_precision(col_totals[i].reduce((a,b) => a + b));
      table_html += "<td>" + col_total + "</td>";
      if (i == cols.length-1) {
        if (data_value.length == 2) total_total = get_precision(deepFlatten(col_totals).reduce((a,b) => a + b) / deepFlatten(col_totals_denominator).reduce((a,b) => a + b));
        else total_total = get_precision(deepFlatten(col_totals).reduce((a,b) => a + b));
        table_html += "<td class='total_total'>" + total_total + "</td>";
      }
    }
  }
  table_html += "</tr>";
  table.innerHTML = table_html + "</table>"; // Add the HTML
}

// Charts

function create_chart(data){

  xs_df = {};
  x_y_dataframe = [];
  rows.forEach(function(e){
    xs_df[e] = e+"_xs";
  });
  for (i=0; i<chart_df.length-1; i++){
    x_y_dataframe[i*2] = chart_df[i+1];
    x_y_dataframe[(i*2)+1] = [xs_df[chart_df[i+1][0]]];
    for (j=1; j<chart_df[0].length; j++) x_y_dataframe[(i*2)+1].push(chart_df[0][j]);
  }
  // console.log("rows", rows, cols);
  // console.log(chart_df, xs_df);
  // console.log(x_y_dataframe);

  if (selected_x == "dow" || selected_x == "month") {
    category_line_chart(xs_df, x_y_dataframe)
  }
  else {
    line_chart(xs_df, x_y_dataframe)
  }
}

function line_chart(xs_df, x_y_dataframe){
  var chart = c3.generate({
    bindto: "#chart",
    data: {
      xs: xs_df,
      xFormat: '%m/%d/%Y',
      columns: x_y_dataframe,
      type: "spline"
      // groups: [
      //   Object.keys(xs_df)
      // ]
    },
    legend: {
      position: 'right'
    },
    axis: {
      x: {
        label: 'Time',
        type: 'timeseries',
        // tick: {
        //   format: format_x_axis()
        // }
      },
      y: {
        tick: {
          //format: d3.format(axis_format)
        },
        min: 0,
        padding: {
          bottom: 0
        },
        label: metric_chart_display[selected_metric_display]
      }
    },
    color: {
      // pattern: color_palette
    },
    tooltip: {

    },
    size: {
      height: 450,
      width: 1000
    }
  });
  d3.select("#chart").select('.c3-axis-y-label').attr("transform", "rotate(0) translate(26,0)");
  d3.select("#chart").select('.c3-axis-x-label').attr("transform", "rotate(0) translate(0,32)");

}

function category_line_chart(xs_df, x_y_dataframe){
  var chart = c3.generate({
    bindto: "#chart",
    data: {
      xs: xs_df,
      xFormat: '%m/%d/%Y',
      columns: x_y_dataframe,
      type: "bar"
    },
    axis: {
      x: {
        label: 'Time',
        type: 'category',
        categories: cols
        // tick: {
        //   format: '%m-%Y'
        // }
      },
      y: {
        tick: {
          //format: d3.format(axis_format)
        },
        min: 0,
        padding: {
          bottom: 0
        },
        label: "Product"
      }
    },
    color: {
      // pattern: color_palette
    },
    tooltip: {

    },
    size: {
      height: 450,
      width: 1000
    }
  });
}
