// Feathers/API setup
const socket = io();
const client = feathers()
  .configure(feathers.hooks())
  .configure(feathers.socketio(socket))
  .configure(feathers.authentication({
    cookie: 'feathers-jwt'
  }));

client.authenticate()
  .then(response => {
    console.info("authenticated successfully");
    client.set('jwt', response.accessToken)
    return client.passport.verifyJWT(response.accessToken);
  })
  .then(payload => {
    console.info("verified JWT");
    $("#loading").hide();
    $("#main").show();
    return client.service('users').get(payload.userId);
  })
  .then(user => {
    client.set('user', user);
  })
  .catch(error => {
    console.log("auth error or not authenticated, redirecting...", error);
    window.location.href = '/login.html';
  });

const airport = client.service('/airportQuery');
const footprintQuery = client.service('/footprintQuery');
const computeHops = client.service('/computeHops');

function logout() {
  // log out of feathers and redirect to login page
  client.logout();
  window.location.href = '/login.html';
}

// toastr config
toastr.options.closeDuration = 12000;
toastr.options.positionClass = "toast-bottom-right";

// Frontend UI logic
var selectedSourceIATA = '';
var selectedDestIATA = '';

// Display warning if flight dist is under this amount
const totalDistThresh = 500; // km

function makeAirportListItem(airport, id) {
  const kmStr = !!(airport.dist / 1000) ? " <small>(" + (airport.dist / 1000) + " km)</small>" : "";
  return '<a href="#"" id="' + id + '" class="list-group-item">' + airport.iata + ' <em>' + airport.name + '<em>' + kmStr + '</a>';
}

function selectSourceIATA(id) {
  if (!!$("#sourceItem1")) {
    $("#sourceItem1").removeClass("list-group-item-info");
  }
  if (!!$("#sourceItem2")) {
    $("#sourceItem2").removeClass("list-group-item-info");
  }
  if (!!$("#sourceItem3")) {
    $("#sourceItem3").removeClass("list-group-item-info");
  }
  $("#" + id).addClass("list-group-item-info");
  selectedSourceIATA = $("#" + id).text();
  if (!!selectedDestIATA && selectedDestIATA.length > 0 && !!selectedDestIATA.split(' ')[0]) {
    airportsToQuery = [selectedSourceIATA.split(' ')[0], selectedDestIATA.split(' ')[0]]
  }
  $("#hopsList").hide();
  $('#numStops').val("0");

}

function selectDestIATA(id) {
  if (!!$("#destItem1")) {
    $("#destItem1").removeClass("list-group-item-info");
  }
  if (!!$("#destItem2")) {
    $("#destItem2").removeClass("list-group-item-info");
  }
  if (!!$("#destItem3")) {
    $("#destItem3").removeClass("list-group-item-info");
  }
  $("#" + id).addClass("list-group-item-info");
  selectedDestIATA = $("#" + id).text();
  if (!!selectedSourceIATA && selectedSourceIATA.length > 0 && !!selectedSourceIATA.split(' ')[0]) {
    airportsToQuery = [selectedSourceIATA.split(' ')[0], selectedDestIATA.split(' ')[0]]
  }
  $("#hopsList").hide();
  $('#numStops').val("0");
}

const doneTypingTimeout = 1500;
var typingTimer = [{}, {}];
var airportsToQuery = []
var paths = [];

// jQuery onload
$(function() {
  // Hide results div
  var destCityList = $("#destCityList");
  var sourceCityList = $("#sourceCityList");
  var co2Result = $("#co2-result");
  var sourceCityOrIATA = $("#sourceCityOrIATA");
  var destCityOrIATA = $("#destCityOrIATA");
  destCityList.hide();
  sourceCityList.hide();
  co2Result.hide();

  $('#numStops').change(function () {
    const hops = $(this).find(":selected").text();
    if (hops == 0) {
      $("#hopsList").hide();
      if (selectedSourceIATA != '' && selectedDestIATA != '') {
        airportsToQuery = [selectedSourceIATA.split(' ')[0], selectedDestIATA.split(' ')[0]]
      }
      return;
    }
    if (selectedSourceIATA != '' && selectedDestIATA != '') {
      computeHops.create({src: selectedSourceIATA.split(' ')[0], dest: selectedDestIATA.split(' ')[0], hops})
      .then(res => {
        var hopsResultHTML = '<div class="form-group"><label>Select desired itenerary</label>';
        hopsResultHTML += '<select id="hopsList" class="form-control">'
        for (var i = 0; i < res.length; i++) {
          const pathStr = generatePathStr(res[i].path);
          hopsResultHTML += '<option value="';
          hopsResultHTML += i + '">'+pathStr+' '+Math.round(res[i].dist/1000)+' km</option>';
        }
        hopsResultHTML += '</select></div>';
        $("#hopsListPlaceholder").html(hopsResultHTML);
        paths = res;
        airportsToQuery = paths[0].path;
        $("#hopsList").change(function() {
          airportsToQuery = paths[parseInt($(this).find(":selected").val())].path;
        });
      })
    }
  });

  function doneTyping(elt) {
    var curInput = $(elt);
    // thunk
    return () => {
      if (curInput.val().length <= 1) {
        if (elt.id === 'inputCityA') {
          sourceCityList.hide();
          sourceCityList.empty();
          sourceCityOrIATA.empty();
        } else if (elt.id === 'inputCityB') {
          destCityList.hide();
          destCityList.empty();
          destCityOrIATA.empty();
        }
        return;
      }
      airport.get(curInput.val())
        .then(ret => {
          $("#hopsList").hide();
          $('#numStops').val("0");
          if (elt.id === 'inputCityA') {
            sourceCityList.empty();
            sourceCityOrIATA.empty();
            if (!ret.isCity) {
              if (ret.data.length == 0) {
                sourceCityOrIATA.html("<em>No airport with this IATA code</em>");
                sourceCityList.show();
                return;
              }
              sourceCityList.append(makeAirportListItem(ret.data[0], "sourceItem1"));
              selectSourceIATA("sourceItem1");
            } else {
              if (ret.data.length == 0) {
                sourceCityOrIATA.html("<em>City not found or error</em>");
                sourceCityList.show();
                return;
              }
              sourceCityOrIATA.html('Closest airports to <em>' + ret.data.formattedAddress + '</em>');
              sourceCityList.append(makeAirportListItem(ret.data.closestAirports[0], "sourceItem1"));
              sourceCityList.append(makeAirportListItem(ret.data.closestAirports[1], "sourceItem2"));
              sourceCityList.append(makeAirportListItem(ret.data.closestAirports[2], "sourceItem3"));
              $("#sourceItem1").click((e) => {
                e.preventDefault();
                selectSourceIATA("sourceItem1");
              });
              $("#sourceItem2").click((e) => {
                e.preventDefault();
                selectSourceIATA("sourceItem2");
              });
              $("#sourceItem3").click((e) => {
                e.preventDefault();
                selectSourceIATA("sourceItem3");
              });
              selectSourceIATA("sourceItem1");
            }
            sourceCityList.show();
          } else if (elt.id === 'inputCityB') {
            destCityList.empty();
            destCityOrIATA.empty();
            if (!ret.isCity) {
              if (ret.data.length == 0) {
                destCityOrIATA.html("<em>No airport with this IATA code</em>");
                destCityList.show();
                return;
              }
              destCityList.append(makeAirportListItem(ret.data[0], "destItem1"));
              selectDestIATA("destItem1");
            } else {
              if (ret.data.length == 0) {
                destCityOrIATA.html("<em>City not found or error</em>");
                destCityList.show();
                return;
              }
              destCityOrIATA.html('Closest airports to <em>' + ret.data.formattedAddress + '</em>');
              destCityList.append(makeAirportListItem(ret.data.closestAirports[0], "destItem1"));
              destCityList.append(makeAirportListItem(ret.data.closestAirports[1], "destItem2"));
              destCityList.append(makeAirportListItem(ret.data.closestAirports[2], "destItem3"));
              $("#destItem1").click((e) => {
                e.preventDefault();
                selectDestIATA("destItem1");
              });
              $("#destItem2").click((e) => {
                e.preventDefault();
                selectDestIATA("destItem2");
              });
              $("#destItem3").click((e) => {
                e.preventDefault();
                selectDestIATA("destItem3");
              });
              selectDestIATA("destItem1");
            }
            destCityList.show();
          }
          if (selectedSourceIATA != '' && selectedDestIATA != '') {
            airportsToQuery = [selectedSourceIATA.split(' ')[0], selectedDestIATA.split(' ')[0]]
          }

        })
        .catch(error => {
          toastr.error("Error processing airport");
          console.error('airport err', error);
        });
    }
  }

  // For each input, set a keyboard listener
  $('.cityInput').each(function(i, elt) {
    const onDoneTyping = doneTyping(elt);
    const cur = $(elt);
    cur.on('keyup', () => {
      clearTimeout(typingTimer[i]);
      typingTimer[i] = setTimeout(onDoneTyping, doneTypingTimeout);
    });
    cur.on('change', () => {
      onDoneTyping();
    });
    cur.on('keydown', () => {
      clearTimeout(typingTimer[i]);
      if (cur.val().length <= 1)
        onDoneTyping();
    })
  });

  // CO2 Calculation
  $('#submit').click(e => {
    e.preventDefault();
    if (selectedSourceIATA == '' || selectedDestIATA == '') {
      // toaster popup yeling at them
      toastr.error("Please select source and destination cities/airports");
      return;
    }

    if (selectedSourceIATA === selectedDestIATA) {
      toastr.warning("Source and destination cities are the same");
      return;
    }

    if (airportsToQuery.length <= 0) {
      airportsToQuery = [selectedSourceIATA.split(' ')[0], selectedDestIATA.split(' ')[0]];
    }

    footprintQuery.create({
      airports: airportsToQuery,
      roundtrip: $('#isRoundtrip').is(":checked"),
      radforcing: $('#includeRadForcing').is(":checked"),
    }).then(res => {
      setModal(res);
      const routeRes = generatePathStr(res.airports);

      $("#route-result").text(routeRes);
      $("#options-result").text((res.roundtrip ? "Roundtrip" : "One-Way") + " | " +
        (res.radforcing ? "With" : "No") + " radiative forcing");
      $("#co2-result-val").text(parseFloat(res.emissions).toFixed(4) + " tons CO2 for " + parseFloat(res.totalDist).toFixed(4) + " km");
      if (res.totalDist < totalDistThresh) {
        $("#dist-warning").text("Warning: this trip is less than "+totalDistThresh+" km");
      } else {
        $("#dist-warning").text("");
      }
      $("#co2-result").show();

    }).catch(err => {
      // toaster error
      toastr.error("Unable to submit footprint query");
      console.error(err);
    })
  })

  // CSV Upload
  var dropZone = document.getElementById('drop-zone');
  var uploadForm = document.getElementById('js-upload-form');

  var startUpload = function(files) {
    if (!!$("#minDist").val() && parseInt($("#minDist").val()) < 0) {
      toastr.warning("Select a min distance >= 0 km");
      return;
    }

    toastr.success("Upload started");
    var form = new FormData();
    form.append('userfile', files[0]);
    form.append('minKM', parseInt($("#minDist").val() || 0));
    form.append('conferenceLocation', $("#conferenceLocation").val() || "");
    form.append('globalRadForcing', $("#radForcingCSV").is(":checked"));
    form.append('shouldAnonymize',$("#anonymizeOutput").is(":checked"));
    $.ajax({
      url: '/csvUpload',
      type: 'POST',

      data: form,
      cache: false,
      contentType: false,
      processData: false,
      headers: {
        "Authorization": client.get('jwt'),
        //"Content-Type": "applicaiton/json"
      },

      // Custom XMLHttpRequest
      xhr: function() {
        var myXhr = $.ajaxSettings.xhr();
        return myXhr;
      },
      success: function(data, textStatus, jqXHR) {
        window.location.href = '/csv.html?id='+data._id;
      },
      error: function(data, textStatus, jqXHR) {
        let curErr = data.responseJSON.error.cause || "Malformed CSV"
        if (Object.keys(curErr).length === 0 && curErr.constructor === Object) {
          curErr = "Malformed CSV. Make sure the upload is formatted correctly and is under 5 MB."
        }
        toastr.error("CSV parse error: "+curErr)
        console.error(data, textStatus, jqXHR);
      }

    });
  };


  uploadForm.addEventListener('submit', function(e) {
    var uploadFiles = document.getElementById('js-upload-files').files;
    e.preventDefault()

    startUpload(uploadFiles)
  })

  dropZone.ondrop = function(e) {
    e.preventDefault();
    this.className = 'upload-drop-zone';

    startUpload(e.dataTransfer.files)
  }

  dropZone.ondragover = function() {
    this.className = 'upload-drop-zone drop';
    return false;
  }

  dropZone.ondragleave = function() {
    this.className = 'upload-drop-zone';
    return false;
  }
});
