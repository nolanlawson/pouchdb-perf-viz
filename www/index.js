/* global $,google */
(function () {
  'use strict';

  var PERF_REPORTS_URL = 'http://127.0.0.1:2020/pouchdb_perf_reports';

  google.load("visualization", "1", {packages:["corechart"]});
  google.setOnLoadCallback(fetchData);

  function createChartAndDraw(info, dataArray) {

    $('body')
      .append($('<h4></h4>').text('Browser: ' + info.userAgent.browser.name + ' ' +
        info.userAgent.browser.major + ' (' + info.userAgent.browser.version + ')'))
      .append($('<h4></h4>').text('OS: ' + info.userAgent.os.name + ' ' +
        info.userAgent.os.version))
      .append($('<h4></h4>').text('Date: ' + new Date(info.ts).toUTCString()));

    var newDiv = $('<div></div>');
    $('body').append(newDiv);
    var data = google.visualization.arrayToDataTable(dataArray);

    var options = {
      title: 'PouchDB Performance Results',
      hAxis : {
        textStyle : {
          fontSize : 10
        },
        slantedTextAngle : 90
      }
    };

    var chart = new google.visualization.LineChart(newDiv[0]);
    chart.draw(data, options);
  }

  function fetchData() {

    $.ajax({
      dataType : 'json',
      url : PERF_REPORTS_URL + '/_design/by_session/_view/by_session',
      data : {reduce : true, group : true, descending : true},
      success : function (response) {
        response.rows.forEach(function (row) {
          var session = row.key;
          $.ajax({
            dataType : 'json',
            url : PERF_REPORTS_URL + '/_design/by_session_and_commit/_view/by_session_and_commit',
            data : {
              startkey : JSON.stringify([session, {}]),
              endkey : JSON.stringify([session]),
              descending : true,
              include_docs : true
            },
            success : function (response) {

              var testNames = Object.keys(response.rows[0].doc.results).sort();
              testNames.splice(testNames.indexOf('completed'), 1);
              var dataArray = [['Commit'].concat(testNames)];
              response.rows.forEach(function (row) {
                var doc = row.doc;
                var commitDate = new Date(doc.commit.ts * 1000).toJSON();
                var currentRow = [commitDate + ' (' + doc.commit.id + ')'];
                Object.keys(doc.results).sort().forEach(function (testResult) {
                  if (testResult === 'completed') {
                    return;
                  }
                  var duration = doc.results[testResult].duration;
                  currentRow.push(duration);
                });
                dataArray.push(currentRow);
              });
              createChartAndDraw(response.rows[0].doc, dataArray);
            }
          });
        });
      }
    });
  }
})();