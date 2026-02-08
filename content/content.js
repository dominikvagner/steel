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

  function getFilterButtons() {
    return Array.from(
      document.querySelectorAll("a.js-quickfilter-button.aui-button-link"),
    ).filter(isFilterButtonVisible);
  }

  async function waitForFilterButtons(timeoutMs = 1200, intervalMs = 100) {
    const start = Date.now();
    let buttons = getFilterButtons();

    while (buttons.length === 0 && Date.now() - start < timeoutMs) {
      await delay(intervalMs);
      buttons = getFilterButtons();
    }

    return buttons;
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

  async function attemptFilterClick(button, normalizedName) {
    if (!button || !button.isConnected) return false;

    try {
      button.scrollIntoView({ block: "center", inline: "center" });
    } catch (error) {
      // Some Jira layouts can throw on scrollIntoView; ignore.
    }

    try {
      button.focus();
    } catch (error) {
      // Some Jira layouts can throw on focus; ignore.
    }

    button.click();
    await delay(180);

    const refreshedButton = getFilterButtons().find((btn) => {
      const buttonText = normalizeFilterText(btn.textContent);
      return buttonText === normalizedName;
    });

    if (
      !refreshedButton ||
      refreshedButton.getAttribute("aria-pressed") !== "true"
    ) {
      return false;
    }

    await delay(250);

    const stableButton = getFilterButtons().find((btn) => {
      const buttonText = normalizeFilterText(btn.textContent);
      return buttonText === normalizedName;
    });

    return Boolean(
      stableButton && stableButton.getAttribute("aria-pressed") === "true",
    );
  }

  // Find and click Jira quick filter buttons
  async function clickPersonFilter(name) {
    const normalizedName = normalizeFilterText(name);
    const maxAttempts = 2;
    let hasCleared = false;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const filterButtons = await waitForFilterButtons(
        attempt === 0 ? 800 : 1500,
      );

      if (filterButtons.length === 0) {
        await delay(150);
        continue;
      }

      if (!hasCleared) {
        // Deselect any currently selected filters once
        filterButtons.forEach((btn) => {
          if (btn.getAttribute("aria-pressed") === "true") {
            btn.click();
          }
        });
        hasCleared = true;
        await delay(120);
      }

      await waitForFilterStability(900, 200);

      // Re-query in case Jira re-rendered the filters
      const freshButtons = getFilterButtons();
      const matchingButton =
        freshButtons.find((btn) => {
          const buttonText = normalizeFilterText(btn.textContent);
          return buttonText === normalizedName;
        }) ||
        freshButtons.find((btn) => {
          const buttonText = normalizeFilterText(btn.textContent);
          return buttonText.includes(normalizedName);
        });

      if (matchingButton && matchingButton.isConnected) {
        const clicked = await attemptFilterClick(
          matchingButton,
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
