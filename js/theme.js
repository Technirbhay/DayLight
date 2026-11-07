
/* =========================================
   DAYLIGHT THEME + WALLPAPER — FIXED
========================================= */

const DaylightTheme = (() => {
  const DB_NAME = "daylight-wallpaper-db";
  const STORE_NAME = "wallpapers";
  const DEFAULT_CLOCK_IMAGE = "assets/images/clock-art.png";
  const AUTO_REFRESH_MS = 60 * 1000;
  const AUTO_API = "https://commons.wikimedia.org/w/api.php";
  let autoWallpaperTimer;
  let autoWallpaperRequest;

  const themes = [
    "mint", "yellow", "peach", "lavender",
    "beige", "pink", "olive"
  ];

  const $ = id => document.getElementById(id);

  const hasChromeStorage = () =>
    typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  function getStorage(key) {
    return new Promise(resolve => {
      if (!hasChromeStorage()) {
        try {
          const value = localStorage.getItem(key);
          resolve(value === null ? null : JSON.parse(value));
        } catch {
          resolve(null);
        }
        return;
      }

      chrome.storage.local.get(key, result => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          resolve(null);
          return;
        }
        resolve(result[key] ?? null);
      });
    });
  }

  function setStorage(data) {
    return new Promise(resolve => {
      if (!hasChromeStorage()) {
        try {
          Object.entries(data).forEach(([key, value]) => {
            if (value === null || value === undefined) localStorage.removeItem(key);
            else localStorage.setItem(key, JSON.stringify(value));
          });
        } catch (error) {
          console.error("Settings storage error:", error);
        }
        resolve();
        return;
      }

      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveWallpaper(blob, key = "custom") {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(blob, key);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async function getWallpaper(key = "custom") {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteWallpaper(key = "custom") {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(key);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function darken(hex, amount = .35) {
    const value = hex.replace("#", "");
    const channels = [0, 2, 4].map(index =>
      Math.round(
        parseInt(value.substring(index, index + 2), 16) * (1 - amount)
      )
    );

    return "#" + channels.map(value =>
      value.toString(16).padStart(2, "0")
    ).join("");
  }

  function rgba(hex, alpha) {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);

    return `rgba(${r},${g},${b},${alpha})`;
  }

  async function applyTheme(theme) {
    if (!themes.includes(theme)) theme = "mint";

    document.documentElement.dataset.theme = theme;

    document.querySelectorAll("[data-theme-choice]").forEach(button => {
      const active = button.dataset.themeChoice === theme;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    const picker = $("customAccent");
    if (picker) picker.value = "#71966b";

    document.documentElement.style.removeProperty("--custom-accent");
    document.documentElement.style.removeProperty("--accent");
    document.documentElement.style.removeProperty("--accent-dark");
    document.documentElement.style.removeProperty("--accent-soft");
    document.documentElement.style.removeProperty("--panel-tint");

    await setStorage({
      daylightTheme: theme,
      daylightCustomAccent: null
    });
  }

  async function applyCustomAccent(color) {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;

    document.documentElement.dataset.theme = "mint";

    const root = document.documentElement;
    root.style.setProperty("--accent", color);
    root.style.setProperty("--accent-dark", darken(color));
    root.style.setProperty("--accent-soft", rgba(color, .19));
    root.style.setProperty("--panel-tint", rgba(color, .15));

    document.querySelectorAll("[data-theme-choice]").forEach(button => {
      button.classList.remove("active");
    });

    await setStorage({
      daylightTheme: "custom",
      daylightCustomAccent: color
    });
  }

  async function applySavedWallpaper() {
    const layer = $("wallpaperLayer");
    if (!layer) return;

    try {
      const blob = await getWallpaper();

      if (layer.dataset.objectUrl) {
        URL.revokeObjectURL(layer.dataset.objectUrl);
        delete layer.dataset.objectUrl;
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        layer.style.backgroundImage = `url("${url}")`;
        layer.dataset.objectUrl = url;
      } else {
        await refreshAutoWallpaper();
      }
    } catch (error) {
      console.error("Wallpaper loading error:", error);
      alert("Could not load wallpaper. Please try again.");
    }
  }

  function getAutoCategory() {
    return getStorage("daylightWallpaperCategory").then(value =>
      typeof value === "string" && value ? value : "nature landscape"
    );
  }

  function applyWallpaperUrl(url) {
    const layer = $("wallpaperLayer");
    if (!layer || !url) return;

    if (layer.dataset.objectUrl) {
      URL.revokeObjectURL(layer.dataset.objectUrl);
      delete layer.dataset.objectUrl;
    }

    layer.style.backgroundImage = `url("${url.replace(/"/g, "%22")}")`;
  }

  async function refreshAutoWallpaper() {
    if (await getWallpaper()) return;
    if (autoWallpaperRequest) return autoWallpaperRequest;

    autoWallpaperRequest = (async () => {
      try {
        const category = await getAutoCategory();
        const params = new URLSearchParams({
          action: "query",
          format: "json",
          origin: "*",
          generator: "search",
          gsrsearch: `${category} -logo -map`,
          gsrnamespace: "6",
          gsrlimit: "20",
          prop: "imageinfo",
          iiprop: "url",
          iiurlwidth: "2400"
        });
        const response = await fetch(`${AUTO_API}?${params}`);
        if (!response.ok) throw new Error(`Wallpaper API returned ${response.status}`);
        const data = await response.json();
        const pages = Object.values(data.query?.pages || {});
        const images = pages
          .map(page => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url)
          .filter(url => /^https?:\/\//i.test(url));

        if (!images.length) throw new Error("No wallpapers found");
        const imageUrl = images[Math.floor(Math.random() * images.length)];
        applyWallpaperUrl(imageUrl);
        await setStorage({
          daylightAutoWallpaperUrl: imageUrl,
          daylightAutoWallpaperUpdatedAt: Date.now()
        });
      } catch (error) {
        console.error("Auto wallpaper loading error:", error);
        const cachedUrl = await getStorage("daylightAutoWallpaperUrl");
        if (cachedUrl) applyWallpaperUrl(cachedUrl);
      } finally {
        autoWallpaperRequest = null;
      }
    })();

    return autoWallpaperRequest;
  }

  async function setAutoCategory(category) {
    await setStorage({ daylightWallpaperCategory: category });
    const custom = await getWallpaper();
    if (!custom) await refreshAutoWallpaper();
  }

  async function applySavedClockImage() {
    const image = $("clockArt");
    if (!image) return;

    try {
      const blob = await getWallpaper("clock");
      if (image.dataset.objectUrl) {
        URL.revokeObjectURL(image.dataset.objectUrl);
        delete image.dataset.objectUrl;
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        image.src = url;
        image.dataset.objectUrl = url;
      } else {
        image.src = DEFAULT_CLOCK_IMAGE;
      }
    } catch (error) {
      console.error("Clock image loading error:", error);
      image.src = DEFAULT_CLOCK_IMAGE;
    }
  }

  async function uploadWallpaper(file) {
    if (!file || !file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert("Please select an image smaller than 15 MB.");
      return;
    }

    try {
      await saveWallpaper(file);
      await applySavedWallpaper();
    } catch (error) {
      console.error("Wallpaper save error:", error);
      alert("Wallpaper could not be saved. Please try another image.");
    }
  }

  async function uploadClockImage(file) {
    if (!file || !file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert("Please select an image smaller than 15 MB.");
      return;
    }

    try {
      await saveWallpaper(file, "clock");
      await applySavedClockImage();
    } catch (error) {
      console.error("Clock image save error:", error);
      alert("Clock image could not be saved. Please try another image.");
    }
  }

  async function resetWallpaper() {
    try {
      await deleteWallpaper();
      await refreshAutoWallpaper();
    } catch (error) {
      console.error("Wallpaper reset error:", error);
      alert("Could not reset wallpaper.");
    }
  }

  async function resetClockImage() {
    try {
      await deleteWallpaper("clock");
      await applySavedClockImage();
    } catch (error) {
      console.error("Clock image reset error:", error);
      alert("Could not reset the clock image.");
    }
  }

  function openSettings() {
    $("settingsOverlay")?.classList.add("active");
  }

  function closeSettings() {
    $("settingsOverlay")?.classList.remove("active");
  }

  async function init() {
    try {
      const savedTheme = await getStorage("daylightTheme");
      const savedAccent = await getStorage("daylightCustomAccent");

      if (savedAccent) {
        const picker = $("customAccent");
        if (picker) picker.value = savedAccent;
        await applyCustomAccent(savedAccent);
      } else {
        await applyTheme(
          themes.includes(savedTheme) ? savedTheme : "mint"
        );
      }

      await applySavedWallpaper();
      await applySavedClockImage();

      const category = await getAutoCategory();
      const categorySelect = $("wallpaperCategory");
      if (categorySelect) categorySelect.value = category;

      clearInterval(autoWallpaperTimer);
      autoWallpaperTimer = setInterval(refreshAutoWallpaper, AUTO_REFRESH_MS);

      /* THEME BUTTONS */
      document.querySelectorAll("[data-theme-choice]").forEach(button => {
        button.addEventListener("click", () => {
          applyTheme(button.dataset.themeChoice);
        });
      });

      /* SETTINGS OPEN/CLOSE */
      $("openSettingsTop")?.addEventListener("click", openSettings);
      $("closeSettings")?.addEventListener("click", closeSettings);

      $("settingsOverlay")?.addEventListener("click", event => {
        if (event.target.id === "settingsOverlay") closeSettings();
      });

      document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeSettings();
      });

      /* WALLPAPER PICKER */
      const wallpaperInput = $("wallpaperInput");

      $("wallpaperButton")?.addEventListener("click", () => {
        wallpaperInput?.click();
      });

      $("settingsWallpaper")?.addEventListener("click", () => {
        wallpaperInput?.click();
      });

      wallpaperInput?.addEventListener("change", async event => {
        const file = event.target.files?.[0];
        if (file) await uploadWallpaper(file);
        event.target.value = "";
      });

      $("resetWallpaper")?.addEventListener("click", resetWallpaper);

      categorySelect?.addEventListener("change", event => {
        setAutoCategory(event.target.value);
      });

      $("refreshAutoWallpaper")?.addEventListener("click", refreshAutoWallpaper);

      const clockImageInput = $("clockImageInput");
      $("settingsClockImage")?.addEventListener("click", () => {
        clockImageInput?.click();
      });

      clockImageInput?.addEventListener("change", async event => {
        const file = event.target.files?.[0];
        if (file) await uploadClockImage(file);
        event.target.value = "";
      });

      $("resetClockImage")?.addEventListener("click", resetClockImage);

      /* CUSTOM COLOUR */
      $("customAccent")?.addEventListener("input", event => {
        applyCustomAccent(event.target.value);
      });

      $("resetAccent")?.addEventListener("click", () => {
        applyTheme("mint");
      });

      /* REMOVE SPOTIFY PLAYLIST */
      $("clearSpotify")?.addEventListener("click", () => {
        const clear = () => {
          if ($("spotifyFrame")) $("spotifyFrame").src = "";
          if ($("spotifyInput")) $("spotifyInput").value = "";
          if ($("spotifyMessage")) $("spotifyMessage").textContent = "Playlist removed.";
        };

        if (!hasChromeStorage()) {
          localStorage.removeItem("daylightSpotifyUrl");
          clear();
          return;
        }

        chrome.storage.local.remove("daylightSpotifyUrl", () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
          }
          clear();
        });
      });

    } catch (error) {
      console.error("Daylight initialization error:", error);
    }
  }

  return { init, applyTheme, applySavedWallpaper, refreshAutoWallpaper };
})();

document.addEventListener("DOMContentLoaded", () => {
  DaylightTheme.init();
});
