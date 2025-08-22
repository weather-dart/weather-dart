// Elements
const latlonEl = document.getElementById("latlon");
const addressEl = document.getElementById("address");
const addressInput = document.getElementById("address-input");
const dateInput = document.getElementById("date-input");
const lumaOutput = document.getElementById("luma-output");
const forecastButton = document.getElementById("forecast-button");
const copyButton = document.getElementById("copy-button");
const tipButton = document.getElementById("tip-button");
const tipMsg = document.getElementById("tip-msg");
const noTipCheckbox = document.getElementById("no-tip");
const qrCanvas = document.getElementById("qr-canvas");

// Initialize date input
const today = new Date().toISOString().split("T")[0];
dateInput.value = today;

// Variables
let currentLat = "";
let currentLon = "";
let currentAddress = "";

// Generate QR Code
function generateQR(url) {
  QRCode.toCanvas(qrCanvas, url, { width: 150 }, function (error) {
    if (error) console.error(error);
  });
}

// Set location
function setLocation(lat, lon, address) {
  currentLat = lat;
  currentLon = lon;
  currentAddress = address;
  latlonEl.textContent = `${lat}, ${lon}`;
  addressEl.textContent = address;
}

// Browser geolocation
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lon = pos.coords.longitude.toFixed(6);
      // Reverse geocode using Nominatim (free API)
      let address = "Fetching address...";
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
        const data = await res.json();
        address = data.display_name || address;
      } catch (e) {
        console.error(e);
      }
      setLocation(lat, lon, address);
    },
    () => setLocation("--", "--", "--")
  );
}

// Address input updates location (geocode)
addressInput.addEventListener("change", async () => {
  const addr = addressInput.value.trim();
  if (!addr) return;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(addr)}`);
    const data = await res.json();
    if (data.length > 0) {
      const { lat, lon, display_name } = data[0];
      setLocation(parseFloat(lat).toFixed(6), parseFloat(lon).toFixed(6), display_name);
    } else {
      alert("Address not found.");
    }
  } catch (e) {
    console.error(e);
  }
});

// Tip button
tipButton.addEventListener("click", () => {
  tipMsg.textContent = "Tip Cozmo when you see him, PayPal coming soon";
});

// Forecast generation
forecastButton.addEventListener("click", () => {
  if (!tipMsg.textContent && !noTipCheckbox.checked) return;

  const useSource = document.querySelector('input[name="location-source"]:checked').value;
  const location = useSource === "latlon" ? `${currentLat}, ${currentLon}` : currentAddress;
  const dateVal = dateInput.value || today;

  const prompt = `LUMA_FORECAST {
  LOCATION: "${location}";
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
  lumaOutput.textContent = prompt;
  navigator.clipboard.writeText(prompt);

  // ChatGPT tab reuse
  let gptWindow = window.open("", "chatgpt");
  if (!gptWindow.location.href.includes("chat.openai.com")) {
    gptWindow.location.href = "https://chat.openai.com/chat";
  }
  gptWindow.focus();
});

// Manual copy
copyButton.addEventListener("click", () => {
  navigator.clipboard.writeText(lumaOutput.textContent);
});

// Generate page QR
generateQR("https://weather-dart.github.io/weather-dart/");
