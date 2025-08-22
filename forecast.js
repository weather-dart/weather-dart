// Elements
const dateField = document.getElementById('date-field');
const latLonSpan = document.getElementById('latlon');
const addressSpan = document.getElementById('address');
const manualAddress = document.getElementById('manual-address');
const getForecastBtn = document.getElementById('get-forecast');
const forecastBox = document.getElementById('forecast-box');
const copyForecastBtn = document.getElementById('copy-forecast');
const tipButton = document.getElementById('tip-button');
const notNowCheckbox = document.getElementById('not-now');
const tipMessage = document.getElementById('tip-message');
const qrContainer = document.getElementById('qr-container');

let lat = '';
let lon = '';
let address = '';
let gptWindow = null;

// Initialize date field
const today = new Date().toISOString().split('T')[0];
dateField.value = today;

// Geolocation
function updateLocation(pos) {
  lat = pos.coords.latitude.toFixed(6);
  lon = pos.coords.longitude.toFixed(6);
  latLonSpan.textContent = `${lat}, ${lon}`;
  reverseGeocode(lat, lon);
}

function reverseGeocode(lat, lon) {
  fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`)
    .then(res => res.json())
    .then(data => {
      address = data.display_name || 'Unknown';
      addressSpan.textContent = address;
    });
}

navigator.geolocation.getCurrentPosition(updateLocation, () => {
  latLonSpan.textContent = 'Unavailable';
  addressSpan.textContent = 'Unavailable';
});

// Manual address input
manualAddress.addEventListener('change', () => {
  const val = manualAddress.value;
  if (val.trim() === '') return;
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}`)
    .then(res => res.json())
    .then(data => {
      if (data.length > 0) {
        lat = parseFloat(data[0].lat).toFixed(6);
        lon = parseFloat(data[0].lon).toFixed(6);
        address = data[0].display_name;
        latLonSpan.textContent = `${lat}, ${lon}`;
        addressSpan.textContent = address;
      }
    });
});

// Build Luma prompt
function buildLumaPrompt() {
  const locChoice = document.querySelector('input[name="locChoice"]:checked').value;
  const loc = locChoice === 'latlon' ? `${lat}, ${lon}` : address;
  const dateVal = dateField.value;

  return `LUMA_FORECAST {
  LOCATION: "${loc}";
  DATE: "${dateVal}";

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
    SESSION_MARKER: Murphy#1430;
  };
}`;
}

// Tip logic
function checkTip() {
  if (!tipButtonClicked && !notNowCheckbox.checked) {
    alert('Please press tip button or check "Not now" before generating forecast.');
    return false;
  }
  return true;
}

let tipButtonClicked = false;
tipButton.addEventListener('click', () => {
  tipButtonClicked = true;
  tipMessage.textContent = 'Tip Cozmo when you see him, Paypal coming soon';
});

// Forecast generation
getForecastBtn.addEventListener('click', () => {
  if (!checkTip()) return;

  const prompt = buildLumaPrompt();
  forecastBox.textContent = prompt;

  navigator.clipboard.writeText(prompt).then(() => {
    console.log('Copied to clipboard');
  });

  if (!gptWindow || gptWindow.closed) {
    gptWindow = window.open('https://chat.openai.com/chat', '_blank');
  } else {
    gptWindow.focus();
  }
});

// Manual copy button
copyForecastBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(forecastBox.textContent);
});

// Generate QR code
function generateQRCode(url) {
  qrContainer.innerHTML = '';
  const img = document.createElement('img');
  img.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=150x150`;
  img.alt = 'Weather-Dart QR Code';
  qrContainer.appendChild(img);
}

generateQRCode('https://weather-dart.github.io/weather-dart/');
