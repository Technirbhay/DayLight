(() => {
  const list = document.getElementById("bookmarkList");
  const addButton = document.getElementById("addBookmark");

  if (!list || !addButton) return;

  const defaults = [
    { name: "Google", url: "https://google.com" },
    { name: "Netflix", url: "https://netflix.com" },
    { name: "Pinterest", url: "https://pinterest.com" }
  ];

  function getBookmarks(callback) {
    chrome.storage.local.get("daylightBookmarks", result => {
      callback(
        Array.isArray(result.daylightBookmarks)
          ? result.daylightBookmarks
          : defaults
      );
    });
  }

  function saveBookmarks(bookmarks) {
    chrome.storage.local.set({ daylightBookmarks: bookmarks }, render);
  }

  function render() {
    getBookmarks(bookmarks => {
      list.replaceChildren();

      bookmarks.forEach((bookmark, index) => {
        const item = document.createElement("div");
        item.className = "bookmark-item";

        const link = document.createElement("a");
        link.href = bookmark.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = bookmark.name;

        const remove = document.createElement("button");
        remove.className = "bookmark-delete";
        remove.textContent = "×";
        remove.title = "Remove bookmark";

        remove.addEventListener("click", () => {
          bookmarks.splice(index, 1);
          saveBookmarks(bookmarks);
        });

        item.append(link, remove);
        list.append(item);
      });
    });
  }

  addButton.addEventListener("click", () => {
    const name = prompt("Bookmark name:");

    if (!name || !name.trim()) return;

    const urlInput = prompt("Website URL (example.com):");

    if (!urlInput || !urlInput.trim()) return;

    let url;

    try {
      url = new URL(
        /^https?:\/\//i.test(urlInput.trim())
          ? urlInput.trim()
          : `https://${urlInput.trim()}`
      );

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      alert("Please enter a valid website URL.");
      return;
    }

    getBookmarks(bookmarks => {
      bookmarks.push({
        name: name.trim(),
        url: url.href
      });

      saveBookmarks(bookmarks);
    });
  });

  render();
})();