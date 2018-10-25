function setModal(res) {
  var finalHTML = '';
  var multFactor;

  if (!!res.error) {
    finalHTML += '<p>Error during processing: </p>';
    finalHTML += '<div class="well">'+res.error+'</div>';
    $("#modalBody").html(finalHTML);
    return;
  }

  for (var i = 0; i < res.partialDists.length; i++) {
    const curDist = res.partialDists[i];
    if (curDist < 785) {
      distClass = 'short range'; //average
      multFactor = 0.14735;
    } else if (curDist >= 785 && curDist <= 3700) {
      distClass = 'medium range'; //economy
      multFactor = 0.08728;
    } else {
      distClass = 'long range'; //economy
      multFactor = 0.07761;
    }

    finalHTML += '<p>'+(i+1)+') '+curDist + 'km × '+multFactor+' ('+distClass+
    ' em. factor) = <em>'+parseFloat(res.partialCO2s[i].toFixed(6))+'</em> metric tons CO2e';

    if ((i+1) != res.partialDists.length) {
      finalHTML += ' +';
    }
    finalHTML += "</p>";
  }

  if (res.roundtrip) {
    finalHTML += '<p> × 2 (round trip)</p>';
  }

  if (res.radforcing) {
    finalHTML += '<p> × 1.891 (radiative forcing factor)';
  }

  if (!res.error) {
    finalHTML += '<p> = <strong>'+parseFloat(res.emissions.toFixed(6))+' </strong>metric tons CO2e</p>';
    finalHTML += '<br><small><a href="/faq.html#context">About this computation</a></small>';
  }
  $("#modalBody").html(finalHTML);
}

function generatePathStr(res) {
  var routeRes = "";
  for (var i = 0; i < res.length; i++) {
    routeRes += res[i];
    routeRes += (res.length != (i + 1)) ? " ➔ " : "";
  }
  return routeRes
}
