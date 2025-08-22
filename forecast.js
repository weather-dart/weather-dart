document.getElementById('current-date').textContent = new Date().toDateString();

let lat = 42.800142;
let lon = -73.951401;
let addr = "1221, Third Avenue, Mont Pleasant, City of Schenectady, Schenectady, New York, 12303, United States";

function updateDisplay() {
  document.getElementById('latlon').textContent = `${lat}, ${lon}`;
  document.getElementById('address').textContent = addr;
}

// Browser geolocation
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(pos => {
    lat = pos.coords.latitude.toFixed(6);
    lon = pos.coords.longitude.toFixed(6);
    updateDisplay();
  });
} else {
  updateDisplay();
}

// Manual address input with real geocoding
document.getElementById('address-input').addEventListener('change', async (e) => {
  addr = e.target.value;
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`);
    const data = await response.json();
    if (data && data.length > 0) {
      lat = parseFloat(data[0].lat).toFixed(6);
      lon = parseFloat(data[0].lon).toFixed(6);
      addr = data[0].display_name;
      updateDisplay();
    } else {
      alert("Address not found. Using original input.");
    }
  } catch (err) {
    alert("Geocoding failed. Using original input.");
  }
});

// Tip gating
let tipAcknowledged = false;
document.getElementById('tip-btn').addEventListener('click', () => {
  alert("Tip Cozmo, when you see him… Paypal coming soon");
  tipAcknowledged = true;
});
document.getElementById('not-now').addEventListener('change', () => {
  tipAcknowledged = true;
});

// Forecast generation with GPT tab reuse
let gptTab = null;
document.getElementById('forecast-btn').addEventListener('click', () => {
  if (!tipAcknowledged) return alert("Please acknowledge tip or select 'Not now'");
  
  const locMode = document.querySelector('input[name="locMode"]:checked').value;
  const location = locMode === 'latlon' ? `${lat}, ${lon}` : addr;

  const prompt = `LUMA_FORECAST {\n LOCATION: "${location}";\n DATE: "Today";\n DATA_NODES: {\n ATMOSPHERIC: DRUID/Atmospheric/*;\n OCEANIC_RIVERINE: DRUID/Water/*;\n WHALESONG: Acoustic/Buoy/*;\n SATELLITE: DRUID/Satellite/*;\n HISTORICAL: Charlie_Archive/*;\n };\n PROCESS: {\n INTEGRATE: REALTIME_NODES + HISTORICAL_ANALOGS;\n ANALYZE: HourlyMinuteForecast;\n OUTPUT_PRECISION: Times(AM_PM, MinuteResolution);\n EVENTS: PrecipitationChange, WindChange, TempChange, StormOnset;\n CONFIDENCE: Stars(★–★★★★★);\n FORMAT: HumanReadableText + GraphicPlaceholder;\n };\n OUTPUT: {\n TEXT_FORECAST: TRUE;\n GRAPHIC_FORECAST: TRUE;\n WAVEFORM_COLLAPSE: TRUE;\n SESSION_MARKER: Murphy#=1430;\n };\n}`;

  document.getElementById('luma-forecast').textContent = prompt;
  navigator.clipboard.writeText(prompt);

  if (!gptTab || gptTab.closed) {
    gptTab = window.open('https://chat.openai.com/', '_blank');
  } else {
    gptTab.focus();
  }
});

// Manual copy button
document.getElementById('copy-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('luma-forecast').textContent);
});

// QR Code centered
const canvas = document.getElementById('qr-code');
const qrUrl = 'https://weather-dart.github.io/weather-dart/';
const qr = new QRious({ element: canvas, value: qrUrl, size: 150 });
