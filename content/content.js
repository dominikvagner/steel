// Steel - Main Content Script
// Orchestrates the wheel overlay and Jira integration

(function () {
  "use strict";

  // Prevent double initialization
  if (window.steelInitialized) return;
  window.steelInitialized = true;

  let overlay = null;
  let triggerButton = null;

  // Get board identifier from URL
  function getBoardId() {
    const url = window.location.href;

    // Jira Cloud: /jira/software/projects/PROJ/boards/123
    const cloudMatch = url.match(/\/boards\/(\d+)/);
    if (cloudMatch) return `board-${cloudMatch[1]}`;

    // Jira Server: /secure/RapidBoard.jspa?rapidView=123
    const serverMatch = url.match(/rapidView=(\d+)/);
    if (serverMatch) return `board-${serverMatch[1]}`;

    // Fallback to pathname
    return `board-${window.location.pathname.replace(/[^a-zA-Z0-9]/g, "-")}`;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function normalizeFilterText(text) {
    return text.replace(/\s+/g, " ").trim().toLowerCase();
  }

  function isFilterButtonVisible(button) {
    return Boolean(
      button.isConnected &&
        button.offsetParent !== null &&
        button.getClientRects().length > 0,
    );
  }

  // --- Jira Cloud filters (checkbox-based) ---
  function getCloudFilters() {
    const fieldset = document.querySelector(
      'fieldset[data-testid="software-filters.ui.filter-selection-bar.filter-selection-bar"]',
    );
    if (!fieldset) return [];

    const items = [];
    const wrappers = fieldset.querySelectorAll('div[role="presentation"]');

    for (const wrapper of wrappers) {
      const checkbox = wrapper.querySelector('input[type="checkbox"]');
      if (!checkbox) continue;

      const label = wrapper.querySelector('label');
      if (!label) continue;

      const rawName = label.textContent.trim();
      if (!rawName) continue;

      items.push({
        name: normalizeFilterText(rawName),
        element: label,
        isActive: () => checkbox.checked,
        click: () => label.click(),
      });
    }

    return items.filter((item) => isFilterButtonVisible(item.element));
  }

  // --- Jira Server filters (anchor-button-based) ---
  function getServerFilters() {
    return Array.from(
      document.querySelectorAll("a.js-quickfilter-button.aui-button-link"),
    )
      .filter(isFilterButtonVisible)
      .map((btn) => ({
        name: normalizeFilterText(btn.textContent),
        element: btn,
        isActive: () => btn.getAttribute("aria-pressed") === "true",
        click: () => btn.click(),
      }));
  }

  // Returns normalized filter objects for whichever Jira variant is detected
  function getFilters() {
    const cloud = getCloudFilters();
    if (cloud.length > 0) return cloud;
    return getServerFilters();
  }

  async function waitForFilters(timeoutMs = 1200, intervalMs = 100) {
    const start = Date.now();
    let filters = getFilters();

    while (filters.length === 0 && Date.now() - start < timeoutMs) {
      await delay(intervalMs);
      filters = getFilters();
    }

    return filters;
  }

  async function waitForFilterStability(timeoutMs = 1200, idleMs = 200) {
    return new Promise((resolve) => {
      let done = false;
      let idleTimer = null;

      const finish = () => {
        if (done) return;
        done = true;
        if (idleTimer) clearTimeout(idleTimer);
        observer.disconnect();
        resolve();
      };

      const observer = new MutationObserver(() => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(finish, idleMs);
      });

      observer.observe(document.body, { childList: true, subtree: true });
      idleTimer = setTimeout(finish, idleMs);
      setTimeout(finish, timeoutMs);
    });
  }

  async function attemptFilterClick(filter, normalizedName) {
    if (!filter || !filter.element.isConnected) return false;

    try {
      filter.element.scrollIntoView({ block: "center", inline: "center" });
    } catch (error) {
      // Some Jira layouts can throw on scrollIntoView; ignore.
    }

    try {
      filter.element.focus();
    } catch (error) {
      // Some Jira layouts can throw on focus; ignore.
    }

    filter.click();
    await delay(180);

    const refreshed = getFilters().find((f) => f.name === normalizedName);
    if (!refreshed || !refreshed.isActive()) {
      return false;
    }

    await delay(250);

    const stable = getFilters().find((f) => f.name === normalizedName);
    return Boolean(stable && stable.isActive());
  }

  // Find and click Jira filter (works for both Server and Cloud)
  async function clickPersonFilter(name) {
    const normalizedName = normalizeFilterText(name);
    const maxAttempts = 2;
    let hasCleared = false;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const filters = await waitForFilters(attempt === 0 ? 800 : 1500);

      if (filters.length === 0) {
        await delay(150);
        continue;
      }

      if (!hasCleared) {
        // Deselect any currently selected filters once
        filters.forEach((f) => {
          if (f.isActive()) {
            f.click();
          }
        });
        hasCleared = true;
        await delay(120);
      }

      await waitForFilterStability(900, 200);

      // Re-query in case Jira re-rendered the filters
      const freshFilters = getFilters();
      const matchingFilter =
        freshFilters.find((f) => f.name === normalizedName) ||
        freshFilters.find((f) => f.name.includes(normalizedName));

      if (matchingFilter && matchingFilter.element.isConnected) {
        const clicked = await attemptFilterClick(
          matchingFilter,
          normalizedName,
        );
        if (clicked) {
          console.log(`Steel: Selected filter for "${name}"`);
          showNotification(`Selected: ${name}`);
          return true;
        }
      }

      await delay(220 * (attempt + 1));
    }

    console.log(`Steel: Could not find filter button for "${name}"`);
    showNotification(`Could not find filter for "${name}"`);
    return false;
  }

  // Show a temporary notification
  function showNotification(message) {
    const existing = document.querySelector(".steel-notification");
    if (existing) existing.remove();

    const notification = document.createElement("div");
    notification.className = "steel-notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("steel-notification-fade");
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  }

  // Create the floating trigger button
  function createTriggerButton() {
    if (triggerButton) return;

    triggerButton = document.createElement("button");
    triggerButton.className = "steel-trigger-btn";
    triggerButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        <circle cx="12" cy="12" r="5"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
    `;
    triggerButton.title = "Steel - Spin the wheel (Alt+Shift+W)";

    triggerButton.addEventListener("click", () => {
      if (overlay) {
        overlay.toggle();
      }
    });

    document.body.appendChild(triggerButton);
  }

  // Initialize the overlay
  function initOverlay() {
    overlay = new SteelOverlay({
      getBoardId: getBoardId,
      onWinnerSelected: (winner) => {
        clickPersonFilter(winner);
      },
      onClose: () => {
        console.log("Steel: Overlay closed");
      },
    });
  }

  // Handle messages from background script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case "toggle-wheel":
        if (overlay) overlay.toggle();
        break;

      case "open-wheel":
        if (overlay) overlay.show();
        break;

      case "get-board-info":
        sendResponse({
          isJiraBoard: true,
          boardId: getBoardId(),
          url: window.location.href,
        });
        return true;

      default:
        break;
    }
  });

  // Initialize when DOM is ready
  function init() {
    console.log("Steel: Initializing on", window.location.href);
    createTriggerButton();
    initOverlay();
  }

  // Run initialization
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
