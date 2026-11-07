(() => {
  const input = document.getElementById("spotifyInput");
  const saveButton = document.getElementById("saveSpotify");
  const frame = document.getElementById("spotifyFrame");
  const message = document.getElementById("spotifyMessage");
  const clearButton = document.getElementById("clearSpotify");

  if (!input || !saveButton || !frame) return;

  const hasChromeStorage = () =>
    typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  function getEmbedUrl(value) {
    try {
      const url = new URL(value.trim());
      if (url.hostname !== "open.spotify.com" && url.hostname !== "www.open.spotify.com") return null;
      const parts = url.pathname.split("/").filter(Boolean);
      const type = parts[0];
      const id = parts[1];
      const validTypes = ["playlist", "album", "track", "artist", "episode", "show"];
      if (!validTypes.includes(type) || !id || !/^[a-zA-Z0-9]+$/.test(id)) return null;
      return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    } catch {
      return null;
    }
  }

  function loadPlaylist(url) {
    const embedUrl = getEmbedUrl(url);
    if (!embedUrl) {
      message.textContent = "Please enter a valid Spotify link.";
      return false;
    }
    const type = new URL(url).pathname.split("/").filter(Boolean)[0];
    frame.dataset.type = type;
    frame.src = embedUrl;
    frame.style.display = "block";
    message.style.display = "none";
    input.value = url;
    return true;
  }

  function saveUrl(url, callback) {
    if (hasChromeStorage()) chrome.storage.local.set({ daylightSpotifyUrl: url }, callback);
    else {
      localStorage.setItem("daylightSpotifyUrl", url);
      callback();
    }
  }

  function readSavedUrl(callback) {
    if (hasChromeStorage()) {
      chrome.storage.local.get("daylightSpotifyUrl", result => callback(result.daylightSpotifyUrl));
    } else callback(localStorage.getItem("daylightSpotifyUrl"));
  }

  function clearSavedUrl(callback) {
    if (hasChromeStorage()) chrome.storage.local.remove("daylightSpotifyUrl", callback);
    else {
      localStorage.removeItem("daylightSpotifyUrl");
      callback();
    }
  }

  saveButton.addEventListener("click", () => {
    const url = input.value.trim();
    if (!loadPlaylist(url)) return;
    saveUrl(url, () => {
      saveButton.textContent = "Saved";
      setTimeout(() => { saveButton.textContent = "Save"; }, 1500);
    });
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") saveButton.click();
  });

  readSavedUrl(url => {
    if (url) loadPlaylist(url);
  });

  clearButton?.addEventListener("click", () => {
    clearSavedUrl(() => {
      frame.src = "";
      frame.style.display = "none";
      message.style.display = "block";
      message.textContent = "Add a playlist to listen here.";
      input.value = "";
    });
  });
})();
