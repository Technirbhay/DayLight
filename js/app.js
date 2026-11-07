
/* =========================================
   DAYLIGHT APP — FIXED
   Clock + Greeting + Editable Name + Search
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
  const hasChromeStorage = () =>
    typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  const hourHand = document.getElementById("hourHand");
  const minuteHand = document.getElementById("minuteHand");
  const secondHand = document.getElementById("secondHand");

  const digitalTime = document.getElementById("digitalTime");
  const dateElement = document.getElementById("date");
  const greeting = document.getElementById("greeting");

  let userNameEl = document.getElementById("userName");

  /* CLOCK */

  function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    if (hourHand) {
      hourHand.style.transform =
        `translateX(-50%) rotate(${(hours % 12) * 30 + minutes * 0.5}deg)`;
    }

    if (minuteHand) {
      minuteHand.style.transform =
        `translateX(-50%) rotate(${minutes * 6 + seconds * 0.1}deg)`;
    }

    if (secondHand) {
      secondHand.style.transform =
        `translateX(-50%) rotate(${seconds * 6}deg)`;
    }

    if (digitalTime) {
      digitalTime.textContent = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    }

    if (dateElement) {
      dateElement.textContent = now.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short"
      });
    }

    if (greeting) {
      if (hours >= 5 && hours < 12) {
        greeting.textContent = "Good Morning";
      } else if (hours >= 12 && hours < 17) {
        greeting.textContent = "Good Afternoon";
      } else if (hours >= 17 && hours < 21) {
        greeting.textContent = "Good Evening";
      } else {
        greeting.textContent = "Good Night";
      }
    }
  }

  updateClock();
  setInterval(updateClock, 1000);

  /* NAME STORAGE */

  function getName() {
    return new Promise(resolve => {
      if (!hasChromeStorage()) {
        resolve(localStorage.getItem("daylightUserName") || "Friend");
        return;
      }

      chrome.storage.local.get("daylightUserName", result => {
        if (chrome.runtime.lastError) {
          resolve("Friend");
          return;
        }
        resolve(result.daylightUserName || "Friend");
      });
    });
  }

  function saveName(name) {
    return new Promise(resolve => {
      if (!hasChromeStorage()) {
        localStorage.setItem("daylightUserName", name);
        resolve();
        return;
      }

      chrome.storage.local.set(
        { daylightUserName: name },
        () => resolve()
      );
    });
  }

  function enableNameEditing(button) {
    button.addEventListener("click", () => {
      if (document.querySelector(".name-edit-input")) return;

      const oldName = button.textContent.trim();

      const input = document.createElement("input");
      input.type = "text";
      input.className = "name-edit-input";
      input.value = oldName;
      input.maxLength = 24;
      input.placeholder = "Your name";
      input.setAttribute("aria-label", "Edit your name");

      button.replaceWith(input);
      input.focus();
      input.select();

      let finished = false;

      async function finish() {
        if (finished) return;
        finished = true;

        const newName = input.value.trim() || "Friend";
        await saveName(newName);

        const newButton = document.createElement("button");
        newButton.type = "button";
        newButton.id = "userName";
        newButton.className = "name-edit";
        newButton.title = "Click to edit your name";
        newButton.textContent = newName;

        input.replaceWith(newButton);
        userNameEl = newButton;

        enableNameEditing(newButton);
      }

      input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault();
          finish();
        }

        if (event.key === "Escape") {
          input.value = oldName;
          finish();
        }
      });

      input.addEventListener("blur", finish);
    });
  }

  const savedName = await getName();

  if (userNameEl) {
    userNameEl.textContent = savedName;
    enableNameEditing(userNameEl);
  }

  /* SEARCH ENGINE */

  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");
  const engineButtons = document.querySelectorAll(".engine-chip");

  let selectedEngine = "https://www.google.com/search?q=";

  engineButtons.forEach(button => {
    button.addEventListener("click", () => {
      selectedEngine = button.dataset.engine;

      engineButtons.forEach(item => {
        item.classList.toggle("active", item === button);
      });
    });
  });

  searchForm?.addEventListener("submit", event => {
    event.preventDefault();

    const query = searchInput?.value.trim();
    if (!query) {
      searchInput?.focus();
      return;
    }

    const looksLikeUrl =
      /^https?:\/\//i.test(query) ||
      (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(query) &&
        !query.includes(" "));

    if (looksLikeUrl) {
      window.location.href = /^https?:\/\//i.test(query)
        ? query
        : `https://${query}`;
    } else {
      window.location.href =
        selectedEngine + encodeURIComponent(query);
    }
  });
});
