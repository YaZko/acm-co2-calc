const socket = io();
const client = feathers()
.configure(feathers.hooks())
.configure(feathers.socketio(socket))
.configure(feathers.authentication({
  cookie: 'feathers-jwt'
}));

function getUrlParameter(name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};
const csvId = getUrlParameter('id');

if (! csvId ) {
  window.location.href = '/index.html';
}
const csvService = client.service('csvInputs');

function logout() {
  // log out of feathers and redirect to login page
  client.logout();
  window.location.href = '/login.html';
}

client.authenticate()
.then(response => {
  $("main").show();
  client.set('jwt', response.accessToken)
  return client.passport.verifyJWT(response.accessToken);
})
.then(payload => {
  return client.service('users').get(payload.userId);
})
.then(user => {
  client.set('user', user);
  csvService.get(csvId).then(csvData => {
    renderCSVData(csvData);
  }).catch(err => {
    console.error("get csv info error", err)
  })
})
.catch(error => {
  console.log("auth error or not authenticated, redirecting...", error);
  window.location.href = '/login.html';
});

function median(values) {

  values.sort ((a,b) => {return a - b});
  half = Math.floor (values.length/2);
  if (values.length % 2) {
    return values[half];
  }
  else {
    return (values[half-1] + values[half]) / 2.0;
  }
}

function standardDeviation(values){
  const avg = average(values);

  var squareDiffs = values.map(function(value){
    const diff = value - avg;
    const sqrDiff = diff * diff;
    return sqrDiff;
  });

  const avgSquareDiff = average(squareDiffs);

  const stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}

function renderCSVData(csvData) {
  const numErrors = (csvData.totalErrors || 0);
  const totalPassengersNoError = csvData.totalPassengers - numErrors;
  if (numErrors == 0) {
    $("#totalPassengers").text(csvData.totalPassengers);
  } else {
    $("#totalPassengers").text(totalPassengersNoError +
      ' (plus ' + csvData.totalErrors + ' errors) ');
  }

  var filteredResults = csvData.results.filter(a => {
    return !a.error /*&& !a.distTooShort*/;
  });

  filteredResults = filteredResults.map(a => {
    return a.emissions;
  })

  var csvHeaderName = csvData.origFilename || ' no filename'
  $("#totalDist").text(parseFloat(csvData.totalDist.toFixed(0)));
  $("#totalCO2").text(parseFloat(csvData.totalEmissions.toFixed(4)));
  //$("#avgCO2").text(parseFloat((csvData.totalEmissions / totalPassengersNoError).toFixed(4)));
  $("#avgCO2").text(parseFloat((average(filteredResults)).toFixed(4)) +
    " ± " + parseFloat(standardDeviation(filteredResults)).toFixed(4) + " std dev");
  $("#medianCO2").text(parseFloat((median(filteredResults)).toFixed(4)));

  $("#csvDate").text("Uploaded on " + (new Date(csvData.createdAt)).toLocaleString())
  $("#downloadBtnForm").attr('action', csvData.csvPath);
  $("#csvHeaderName").text(csvHeaderName);


  if (!!csvData.ignoreUnderDist) {
     $("#minDistCutoff").text("Minimum distance cutoff set to "
     + csvData.ignoreUnderDist + "km");
  }
  $("#downloadBtnForm").show();

  if (!!csvData.conferenceLocation) {
    csvHeaderName += ' - ' + csvData.conferenceLocation;
  }
  $("#csvName").text(csvHeaderName);

  var row = 1;
  var btable = $("#breakdownTable")[0];

  var curError = 0;
  var errorText = "";

  csvData.results.map(passenger => {
    var r = btable.insertRow(row);
    r.insertCell(0).innerHTML = row;
    r.insertCell(1).innerHTML = passenger.passengerName || 'n/a';
    var routeRes = "";
    for (var i = 0; i < passenger.airports.length; i++) {
      routeRes += passenger.airports[i] || 'n/a';
      routeRes += (passenger.airports.length != (i + 1)) ? " ➔ " : "";
    }
    r.insertCell(2).innerHTML = routeRes;
    r.insertCell(3).innerHTML = passenger.inputCities;
    r.insertCell(4).innerHTML = !!passenger.roundtrip;
    r.insertCell(5).innerHTML = passenger.radforcing;
    const distCell = r.insertCell(6);
    const passengerDist = parseFloat(passenger.totalDist.toFixed(0));
    distCell.innerHTML = passengerDist;
    const emissionsCell = r.insertCell(7);
    emissionsCell.innerHTML = !passenger.distTooShort ?
    parseFloat(passenger.emissions).toFixed(4) : 'n/a';

    if (passenger.distTooShort && !passenger.error) {
      $(distCell).addClass("warning");
      $(emissionsCell).addClass("warning");
    }

    if (!!passenger.error) {
      //$(distCell).addClass("error");
      //$(emissionsCell).addClass("error");
      $(r).addClass("danger");
      emissionsCell.innerHTML = "error";
      distCell.innerHTML = "error";
      r.id='error-'+curError;

      if (curError < 4) {
        errorText += '<div class="alert alert-danger" role="alert" ' +
        'onclick="location.href=\'#'+r.id+'\'" style="cursor: pointer;"> ' +
        'An error occured during processing: '+passenger.error+' </div>';
      }
      else if (curError == 4) {
        errorText += '<div class="alert alert-danger" role="alert" ' +
        'onclick="location.href=\'#'+r.id+'\'" style="cursor: pointer;"> ' +
        'Scroll down to see more errors </div>';
      }
      curError++;
    }
    //style="cursor: pointer;" data-toggle="modal" data-target="#drilldownModal"
    $(r).css("cursor", "pointer");
    $(r).attr("data-toggle", "modal");
    $(r).attr("data-target", "#drilldownModal");
    const pos = row;
    $(r).click(function(){
      setModal(passenger);
      $('#drilldownLabel').text('Drilldown for '+(passenger.passengerName || "Passenger " + pos))
    });
    row+=1;
  });
  csvResults = csvData;

  if (numErrors > 0) {
    $('#errors-container').show();
    $('#errors-container').html(errorText);
  }
  $("#loading").hide();
}
