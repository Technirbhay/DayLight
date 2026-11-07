(() => {
  const $ = id => document.getElementById(id);

  const weatherCodes = {
    0: ["Clear sky", "☀"],
    1: ["Mainly clear", "🌤"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁"],
    45: ["Foggy", "🌫"],
    48: ["Foggy", "🌫"],
    51: ["Light drizzle", "🌦"],
    53: ["Drizzle", "🌦"],
    55: ["Heavy drizzle", "🌧"],
    61: ["Light rain", "🌧"],
    63: ["Rain", "🌧"],
    65: ["Heavy rain", "🌧"],
    71: ["Light snow", "❄"],
    73: ["Snow", "❄"],
    75: ["Heavy snow", "❄"],
    80: ["Rain showers", "🌦"],
    81: ["Rain showers", "🌧"],
    82: ["Heavy showers", "⛈"],
    95: ["Thunderstorm", "⛈"],
    96: ["Thunderstorm", "⛈"],
    99: ["Thunderstorm", "⛈"]
  };

  async function fetchWeather(latitude, longitude) {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&timezone=auto`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Weather service unavailable");
    }

    const data = await response.json();
    const current = data.current;

    const info = weatherCodes[current.weather_code] ||
      ["Weather available", "🌤"];

    $("temperature").textContent =
      `${Math.round(current.temperature_2m)}°`;

    $("weatherDescription").textContent = info[0];
    $("weatherIcon").textContent = info[1];

    $("weatherWind").textContent = Math.round(current.wind_speed_10m);

    $("weatherHumidity").textContent =
      Math.round(current.relative_humidity_2m);

    $("weatherLocation").textContent = "Your current area";
  }

  function loadWeather() {
    if (!navigator.geolocation) {
      $("weatherDescription").textContent = "Location unavailable";
      $("weatherLocation").textContent = "Enable location access";
      return;
    }

    $("weatherDescription").textContent = "Finding weather...";
    $("weatherLocation").textContent = "Checking your location";

    navigator.geolocation.getCurrentPosition(
      position => {
        fetchWeather(
          position.coords.latitude,
          position.coords.longitude
        ).catch(() => {
          $("weatherDescription").textContent = "Couldn't load weather";
          $("weatherLocation").textContent = "Try again later";
        });
      },
      () => {
        $("weatherDescription").textContent = "Location not available";
        $("weatherLocation").textContent = "Allow location in Chrome";
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 600000
      }
    );
  }

  $("refreshWeather").addEventListener("click", loadWeather);

  loadWeather();
})();
