// ===== Weather-Dart JS =====
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('date');
  const latlonDiv = document.getElementById('latlon');
  const addressDiv = document.getElementById('address');
  const manualAddress = document.getElementById('manualAddress');
  const tipButton = document.getElementById('tipButton');
  const notNow = document.getElementById('notNow');
  const tipMessage = document.getElementById('tipMessage');
  const getForecast = document.getElementById('getForecast');
  const forecastBox = document.getElementById('forecastBox');
  const openGPT = document.getElementById('openGPT');
  const qrCanvas = document.getElementById('qrCanvas');
  let lat = '';
  let lon = '';
  let displayAddress = '';
  let tipAcknowledged = false;
  let chatGPTWindow = null;

  // --- Date input default to today ---
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;

  // --- Geolocation ---
  function updateLocationDisplay() {
    latlonDiv.textContent = `Lat/Lon: ${lat || 'Unavailable'}, ${lon || 'Unavailable'}`;
    addressDiv.textContent = `Address: ${displayAddress || 'Unavailable'}`;
  }

  function reverseGeocode(lat, lon) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`)
      .then(res => res.json())
      .then(data => {
        displayAddress = data.display_name || `Approx Address for ${lat}, ${lon}`;
        updateLocationDisplay();
      })
      .catch(() => {
        displayAddress = `Approx Address for ${lat}, ${lon}`;
        updateLocationDisplay();
      });
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      lat = pos.coords.latitude.toFixed(6);
      lon = pos.coords.longitude.toFixed(6);
      reverseGeocode(lat, lon);
    }, () => updateLocationDisplay());
  } else {
    updateLocationDisplay();
  }

  // --- Manual address entry ---
  manualAddress.addEventListener('change', () => {
    const query = manualAddress.value;
    fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(results => {
        if (results.length > 0) {
          lat = parseFloat(results[0].lat).toFixed(6);
          lon = parseFloat(results[0].lon).toFixed(6);
          displayAddress = results[0].display_name;
          updateLocationDisplay();
        } else {
          alert('Address not found. Please refine the input.');
        }
      })
      .catch(() => alert('Geocoding currently unavailable.'));
  });

  // --- Tip gating ---
  tipButton.addEventListener('click', () => {
    tipMessage.textContent = "Tip Cozmo when you see him — PayPal coming soon";
    tipAcknowledged = true;
  });
  notNow.addEventListener('change', () => {
    if (notNow.checked) tipAcknowledged = true;
  });

  // --- Generate Luma Forecast ---
  getForecast.addEventListener('click', () => {
    if (!tipAcknowledged) {
      alert('Please acknowledge tip or check "Not now, thank you" before proceeding.');
      return;
    }
    const locRadio = document.querySelector('input[name="locSource"]:checked').value;
    const LOCATION = locRadio === 'latlon' ? `${lat}, ${lon}` : displayAddress;
    const DATE = dateInput.value;
    const LUMA_FORECAST = `LUMA_FORECAST {
  LOCATION: "${LOCATION}";
  DATE: "${DATE}";

  DATA_NODES: {
    ATMOSPHERIC: DRUID/Atmospheric/*;
    OCEANIC_RIVERINE: DRUID/Water/*;
    WHALESONG: Acoustic/Buoy/*;
    SATELLITE: DRUID/Satellite/*;
    HISTORICAL: Charlie_Archive/*;
  };

  PROCESS: {
    INTEGRATE: REALTIME_NODES + HISTORICAL_ANALOGS;
    ANALYZE: HourlyMinuteForecast;
    OUTPUT_PRECISION: Times(AM_PM, MinuteResolution);
    EVENTS: PrecipitationChange, WindChange, TempChange, StormOnset;
    CONFIDENCE: Stars(★–★★★★★);
    FORMAT: HumanReadableText + GraphicPlaceholder;
  };

  OUTPUT: {
    TEXT_FORECAST: TRUE;
    GRAPHIC_FORECAST: TRUE;
    WAVEFORM_COLLAPSE: TRUE;
    SESSION_MARKER: Murphy#=1430;
  };
}`;
    forecastBox.textContent = LUMA_FORECAST;

    navigator.clipboard.writeText(LUMA_FORECAST).then(() => {
      console.log('Copied to clipboard');
    }).catch(() => {
      alert("Automatic copy failed — use the Copy button below the prompt or long-press to copy.");
    });
  });

  // --- Open GPT button ---
  openGPT.addEventListener('click', () => {
    if (chatGPTWindow && !chatGPTWindow.closed) {
      chatGPTWindow.focus();
    } else {
      chatGPTWindow = window.open('https://chat.openai.com/chat', 'chatgpt');
    }
  });

  // --- Generate QR code ---
  QRCode.toCanvas(qrCanvas, 'https://weather-dart.github.io/weather-dart/', function (error) {
    if (error) console.error(error);
  });
});
