const socket = io();
const client = feathers()
  .configure(feathers.hooks())
  .configure(feathers.socketio(socket))
  .configure(feathers.authentication({
    cookie: 'feathers-jwt'
  }));

const csvService = client.service('csvInputs');
function logout() {
  // log out of feathers and redirect to login page
  client.logout();
  window.location.href = '/login.html';
}

client.authenticate()
  .then(response => {
    console.info("authenticated successfully");
    $("main").show();
    client.set('jwt', response.accessToken)
    return client.passport.verifyJWT(response.accessToken);
  })
  .then(payload => {
    console.info("verified JWT");
    return client.service('users').get(payload.userId);
  })
  .then(user => {
    client.set('user', user);
    csvService.find().then(csvData => {
      renderCSVInputs(csvData);
    }).catch(err => {
      console.error("get csv info error", err)
    })
  }).catch(err => {
    window.location.href = '/login.html';
  })

  function renderCSVInputs(csvData) {
    var rtable = $("#myCSVS")[0];
    var row = 1;
    csvData.data.reverse().map(csvInput => {
      var r = rtable.insertRow(row);
      $(r).click(() => {
        window.location.href = '/csv.html?id='+csvInput._id;
      });
      $(r).css('cursor', 'pointer');
      r.insertCell(0).innerHTML = row;
      r.insertCell(1).innerHTML = (new Date(csvInput.createdAt)).toLocaleString()
      r.insertCell(2).innerHTML = csvInput.origFilename || 'no file name'
      r.insertCell(3).innerHTML = csvInput.totalPassengers
      r.insertCell(4).innerHTML = parseFloat(csvInput.totalEmissions.toFixed(4)) + " tons"
      r.insertCell(5).innerHTML = ''+
            '<form method="get" action="'+csvInput.csvPath+'">'+
        '<button type="submit" id="downloadBtn" class="btn btn-default" aria-label="Left Align">'+
          '<span class="glyphicon glyphicon-download-alt" aria-hidden="true"></span>'+
         ' Download'+
        '</button>'+
      '</form>'
      row +=1;
    })
    $("#loading").hide();
    $("#myCSVS").show();
  }
