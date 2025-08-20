document.addEventListener('DOMContentLoaded', () => {
  const currentDateEl = document.getElementById('current-date');
  const currentLocationEl = document.getElementById('current-location');
  const forecastOutput = document.getElementById('forecast-output');
  const addressInput = document.getElementById('address-input');
  const getForecastBtn = document.getElementById('get-forecast');
  const copyButton = document.getElementById('copy-button');
  const inputErrorEl = document.getElementById('input-error');
  const tipButton = document.getElementById('tip-button');
  const notNowCheckbox = document.getElementById('not-now-checkbox');

  let lat = null;
  let lon = null;
  let address = '';
  let tipConfirmed = false;

  // Display current date
  const now = new Date();
  currentDateEl.textContent = `Date: ${now.toDateString()}`;

  // Load geolocation
  async function loadGeoLocation() {
    if (!navigator.geolocation) {
      currentLocationEl.textContent = 'Geolocation not supported';
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      lat = position.coords.latitude.toFixed(6);
      lon = position.coords.longitude.toFixed(6);

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18`);
        const data = await res.json();
        address = data.display_name || '';
        currentLocationEl.innerHTML = `Lat/Lon: ${lat}, ${lon}<br>Address: ${address}`;
      } catch {
        address = '';
        currentLocationEl.innerHTML = `Lat/Lon: ${lat}, ${lon}`;
      }
    }, () => {
      currentLocationEl.textContent = 'Unable to detect location';
    });
  }

  loadGeoLocation();

  // Update internal variables from input
  async function updateVariablesFromInput() {
    const input = addressInput.value.trim();
    inputErrorEl.textContent = '';
    if (!input) return;

    try {
      const query = encodeURIComponent(input);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        lat = parseFloat(data[0].lat).toFixed(6);
        lon = parseFloat(data[0].lon).toFixed(6);
        address = data[0].display_name;
        currentLocationEl.innerHTML = `Lat/Lon: ${lat}, ${lon}<br>Address: ${address}`;
      } else {
        inputErrorEl.textContent = 'Address not found. Please check input.';
      }
    } catch {
      inputErrorEl.textContent = 'Geocoding failed. Please try again.';
    }
  }

  addressInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') updateVariablesFromInput(); });
  addressInput.addEventListener('blur', updateVariablesFromInput);

  // Tip button
  tipButton.addEventListener('click', () => {
    alert('Help Cozmo when you see him (:');
    tipConfirmed = true;
    updateForecastButtonState();
  });

  notNowCheckbox.addEventListener('change', () => {
    updateForecastButtonState();
  });

  function updateForecastButtonState() {
    getForecastBtn.disabled = !(tipConfirmed || notNowCheckbox.checked);
  }

  // Build LUMA_FORECAST
  function buildPrompt(locationStr) {
    return `
LUMA_FORECAST {
  LOCATION: "${locationStr}";
  DATE: "Today";

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
    SESSION_MARKER: Murphy#=0134;
  };
}`.trim();
  }

  // Forecast button
  getForecastBtn.addEventListener('click', async () => {
    await updateVariablesFromInput(); // commit latest input
    const source = document.querySelector('input[name="source"]:checked').value;
    let locationStr = '';

    if (source === 'latlon') {
      if (!lat || !lon) {
        inputErrorEl.textContent = 'Geolocation still loading. Please wait.';
        return;
      }
      locationStr = `${lat}, ${lon}`;
    } else {
      if (!address) {
        inputErrorEl.textContent = 'No confirmed address available. Please update internal address first.';
        return;
      }
      locationStr = address;
    }

    forecastOutput.textContent = buildPrompt(locationStr);

    try { await navigator.clipboard.writeText(forecastOutput.textContent); } catch {}

    window.open('https://chat.openai.com/', '_blank');
  });

  // Manual copy
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(forecastOutput.textContent);
      alert('Copied to clipboard!');
    } catch {
      alert('Copy failed.');
    }
  });
});
