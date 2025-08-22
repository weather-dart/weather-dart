// --------- DOM ---------
const dateField       = document.getElementById('date-field');
const latLonSpan      = document.getElementById('latlon');
const addressSpan     = document.getElementById('address');
const geoNote         = document.getElementById('geo-note');

const manualAddress   = document.getElementById('manual-address');
const forecastBox     = document.getElementById('forecast-box');
const getForecastBtn  = document.getElementById('get-forecast');
const copyForecastBtn = document.getElementById('copy-forecast');

const tipButton       = document.getElementById('tip-button');
const notNowCheckbox  = document.getElementById('not-now');
const tipMessage      = document.getElementById('tip-message');

const statusEl        = document.getElementById('status');
const qrContainer     = document.getElementById('qr-container');

// --------- State ---------
let lat = '';
let lon = '';
let address = '';
let tipAcknowledged = false;
let gptWindowRef = null; // named window for reuse

// --------- Helpers ---------
function setTodayLocal() {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60_000;
  const local = new Date(now.getTime() - tzOffsetMs);
  dateField.value = local.toISOString().split('T')[0]; // YYYY-MM-DD
}

function toFixed6(v) {
  return Number(v).toFixed(6);
}

function setLatLonDisplay(phi, lam) {
  latLonSpan.textContent = `${toFixed6(phi)}, ${toFixed6(lam)}`;
}

function setAddressDisplay(text) {
  addressSpan.textContent = text;
}

function setStatus(msg) {
  statusEl.textContent = msg || '';
  if (msg) {
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(() => (statusEl.textContent = ''), 4000);
  }
}

function politeFetch(url) {
  // Nominatim requires polite use; fetch is fine client-side for light usage.
  return fetch(url, {
    headers: {
      // Can't set User-Agent from browser; rely on referrer. Keep requests minimal.
      'Accept': 'application/json'
    }
  });
}

// --------- Geocoding ---------
async function reverseGeocode(phi, lam) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(phi)}&lon=${encodeURIComponent(lam)}&zoom=16&addressdetails=1`;
    const res = await politeFetch(url);
    const data = await res.json();
    if (data && data.display_name) {
      address = data.display_name;
      setAddressDisplay(address);
      geoNote.textContent = '';
    } else {
      address = `Approx Address for ${toFixed6(phi)}, ${toFixed6(lam)}`;
      setAddressDisplay(address);
      geoNote.textContent = 'Reverse geocode failed — address is approximate.';
    }
  } catch {
    address = `Approx Address for ${toFixed6(phi)}, ${toFixed6(lam)}`;
    setAddressDisplay(address);
    geoNote.textContent = 'Reverse geocode failed — address is approximate.';
  }
}

async function forwardGeocode(query) {
  const q = query.trim();
  if (!q) return false;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=1`;
    const res = await politeFetch(url);
    const arr = await res.json();
    if (Array.isArray(arr) && arr.length > 0) {
      const best = arr[0];
      lat = toFixed6(best.lat);
      lon = toFixed6(best.lon);
      setLatLonDisplay(lat, lon);
      address = best.display_name || q;
      setAddressDisplay(address);
      geoNote.textContent = '';
      return true;
    } else {
      alert('Address not found. Please refine the input.');
      return false;
    }
  } catch (e) {
    alert('Geocoding currently unavailable; please enter address manually.');
    return false;
  }
}

// --------- Geolocation init ---------
function initGeolocation() {
  if (!('geolocation' in navigator)) {
    latLonSpan.textContent = 'Unavailable';
    addressSpan.textContent = 'Unavailable';
    geoNote.textContent = 'Geolocation not supported. Enter address manually.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      lat = toFixed6(pos.coords.latitude);
      lon = toFixed6(pos.coords.longitude);
      setLatLonDisplay(lat, lon);
      await reverseGeocode(lat, lon);
    },
    (err) => {
      latLonSpan.textContent = 'Unavailable';
      addressSpan.textContent = 'Unavailable';
      geoNote.textContent = 'Geolocation denied. Enter address manually.';
      console.warn('Geolocation error:', err);
    },
    { enableHighAccuracy: true, maximumAge: 30_000, timeout: 12_000 }
  );
}

// --------- Luma Prompt ---------
function currentLocChoice() {
  const checked = document.querySelector('input[name="locChoice"]:checked');
  return checked ? checked.value : 'latlon';
}

function buildLumaPrompt() {
  const dateVal = (dateField.value || '').trim();
  const use = currentLocChoice();
  const loc =
    use === 'address'
      ? (address || '').trim()
      : `${lat || ''}, ${lon || ''}`.trim();

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
    SESSION_MARKER: Murphy#=1430;
  };
}`;
}

// --------- Tip gating ---------
tipButton.addEventListener('click', () => {
  tipAcknowledged = true;
  tipMessage.textContent = 'Tip Cozmo when you see him — PayPal coming soon';
});

function tipGateSatisfied() {
  if (!tipAcknowledged && !notNowCheckbox.checked) {
    alert('Please press the tip button OR check "Not now, thank you" before generating the forecast.');
    return false;
  }
  return true;
}

// --------- Clipboard & ChatGPT tab handling ---------
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function openOrFocusChatGPT() {
  // Reuse a *named* window so we can focus it next time.
  const url = 'https://chat.openai.com/chat';
  try {
    gptWindowRef = window.open(url, 'chatgpt');
    if (gptWindowRef) gptWindowRef.focus();
  } catch (e) {
    // If blocked, render a fallback link.
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open ChatGPT';
    link.className = 'btn inline';
    statusEl.innerHTML = '';
    statusEl.appendChild(link);
  }
}

// --------- Events ---------
manualAddress.addEventListener('change', async () => {
  await forwardGeocode(manualAddress.value);
});
manualAddress.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    await forwardGeocode(manualAddress.value);
  }
});

getForecastBtn.addEventListener('click', async () => {
  if (!tipGateSatisfied()) return;

  const prompt = buildLumaPrompt();
  forecastBox.textContent = prompt;

  // Copy FIRST (critical on mobile), then open/focus ChatGPT.
  const copied = await copyToClipboard(prompt);
  if (copied) {
    setStatus('Prompt copied — paste into ChatGPT and press Enter.');
  } else {
    setStatus('Automatic copy failed — use the Copy Forecast button.');
  }

  // Now open or focus our named ChatGPT tab.
  openOrFocusChatGPT();
});

copyForecastBtn.addEventListener('click', async () => {
  const ok = await copyToClipboard(forecastBox.textContent || '');
  setStatus(ok ? 'Copied!' : 'Copy failed — long-press to select & copy.');
});

// --------- QR Code ---------
function generateQRCode(url) {
  const img = document.createElement('img');
  img.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=150x150`;
  img.alt = 'Weather-Dart QR Code';
  img.width = 150;
  img.height = 150;
  qrContainer.innerHTML = '';
  qrContainer.appendChild(img);
}

// --------- Init ---------
document.addEventListener('DOMContentLoaded', () => {
  setTodayLocal();
  initGeolocation();
  generateQRCode('https://weather-dart.github.io/weather-dart/');
});
