// Steel - Overlay Component
// Manages the wheel overlay UI and controls

class SteelOverlay {
  constructor(options = {}) {
    this.onClose = options.onClose || (() => {});
    this.onWinnerSelected = options.onWinnerSelected || (() => {});
    this.getBoardId = options.getBoardId || (() => "default");

    this.overlay = null;
    this.wheel = null;
    this.isVisible = false;
    this.names = [];
    this.activeNames = [];
    this.lastWinner = null;
    this.pendingRemoval = null;
    this.isEditing = false;
  }

  async loadNames() {
    const boardId = this.getBoardId();
    const storageKey = `board:${boardId}`;

    try {
      const result = await browser.storage.local.get(storageKey);
      const boardData = result[storageKey] || {
        names: [],
        activeNames: [],
        lastWinner: null,
        pendingRemoval: null,
      };

      this.names = boardData.names || [];
      this.activeNames = boardData.activeNames || [...this.names];
      this.lastWinner = boardData.lastWinner || null;
      this.pendingRemoval = boardData.pendingRemoval || null;

      // If activeNames is empty but names exist, reset
      if (this.activeNames.length === 0 && this.names.length > 0) {
        this.activeNames = [...this.names];
        await this.saveNames();
      }
    } catch (error) {
      console.error("Steel: Failed to load names:", error);
      this.names = [];
      this.activeNames = [];
      this.lastWinner = null;
      this.pendingRemoval = null;
    }
  }

  async saveNames() {
    const boardId = this.getBoardId();
    const storageKey = `board:${boardId}`;

    try {
      await browser.storage.local.set({
        [storageKey]: {
          names: this.names,
          activeNames: this.activeNames,
          lastWinner: this.lastWinner,
          pendingRemoval: this.pendingRemoval,
        },
      });
    } catch (error) {
      console.error("Steel: Failed to save names:", error);
    }
  }

  async show() {
    if (this.isVisible) return;

    await this.loadNames();
    if (!this.overlay) {
      this.createOverlay();
    } else {
      this.overlay.style.display = "block";
      this.refreshOverlayState();
    }
    this.isVisible = true;

    // Hide the trigger button
    const triggerBtn = document.querySelector(".steel-trigger-btn");
    if (triggerBtn) triggerBtn.style.display = "none";

    // Focus the wheel for keyboard control
    setTimeout(() => {
      const canvas = this.overlay.querySelector(".steel-wheel-canvas");
      if (canvas) canvas.focus();
    }, 100);
  }

  hide() {
    if (!this.isVisible) return;

    if (this.overlay) {
      this.overlay.style.display = "none";
    }
    this.isVisible = false;

    // Show the trigger button
    const triggerBtn = document.querySelector(".steel-trigger-btn");
    if (triggerBtn) triggerBtn.style.display = "flex";

    this.onClose();
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  createOverlay() {
    this.overlay = document.createElement("div");
    this.overlay.className = "steel-overlay";
    this.overlay.innerHTML = `
      <div class="steel-container">
        <div class="steel-wheel-container"></div>
        <div class="steel-result" style="display: none;">
          <span class="steel-result-name"></span>
        </div>
        <div class="steel-controls">
          <div class="steel-controls-row">
            <button class="steel-btn steel-spin-btn">Spin</button>
          </div>
          <div class="steel-controls-row">
            <button class="steel-btn steel-reset-btn">Reset</button>
            <button class="steel-btn steel-edit-btn">Edit</button>
            <button class="steel-btn steel-close-btn">Close</button>
          </div>
        </div>
        <div class="steel-editor" style="display: none;">
          <div class="steel-names-list"></div>
          <div class="steel-editor-controls">
            <button class="steel-btn steel-done-btn">Done</button>
          </div>
        </div>
        <div class="steel-status"></div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Initialize wheel
    const wheelContainer = this.overlay.querySelector(".steel-wheel-container");
    this.wheel = new SteelWheel(wheelContainer, {
      names: this.activeNames,
      size: 230,
      onSpinEnd: (winner, index) => this.handleSpinEnd(winner, index),
    });

    this.bindEvents();
    this.refreshOverlayState();
  }

  refreshOverlayState() {
    if (!this.overlay) return;

    if (this.wheel) {
      this.wheel.setNames(this.activeNames);
      this.wheel.setHighlight(this.pendingRemoval || null);
    }

    const result = this.overlay.querySelector(".steel-result");
    const resultName = this.overlay.querySelector(".steel-result-name");
    if (this.lastWinner) {
      result.style.display = "block";
      resultName.textContent = this.lastWinner;
    } else {
      result.style.display = "none";
    }

    this.isEditing = false;
    const editor = this.overlay.querySelector(".steel-editor");
    const controls = this.overlay.querySelector(".steel-controls");
    editor.style.display = "none";
    controls.style.display = "flex";

    this.updateUI();
  }

  bindEvents() {
    // Close button
    this.overlay
      .querySelector(".steel-close-btn")
      .addEventListener("click", () => this.hide());

    // Escape key
    document.addEventListener(
      "keydown",
      (this.handleKeyDown = (e) => {
        if (e.key === "Escape" && this.isVisible) {
          this.hide();
        }
      }),
    );

    // Spin button
    this.overlay
      .querySelector(".steel-spin-btn")
      .addEventListener("click", async () => {
        await this.removePendingWinner();
        if (this.wheel) this.wheel.spin();
      });

    // Edit button
    this.overlay
      .querySelector(".steel-edit-btn")
      .addEventListener("click", () => this.showEditor());

    // Reset button
    this.overlay
      .querySelector(".steel-reset-btn")
      .addEventListener("click", () => this.resetList());

    // Editor done
    this.overlay
      .querySelector(".steel-done-btn")
      .addEventListener("click", () => this.hideEditor());
  }

  updateUI() {
    const spinBtn = this.overlay.querySelector(".steel-spin-btn");
    const status = this.overlay.querySelector(".steel-status");

    if (this.activeNames.length === 0 && this.names.length > 0) {
      spinBtn.disabled = true;
      spinBtn.textContent = "Done";
      status.textContent = "Reset to spin again";
    } else if (this.names.length === 0) {
      spinBtn.disabled = true;
      spinBtn.textContent = "Spin";
      status.textContent = "No names - click Edit";
    } else {
      spinBtn.disabled = false;
      spinBtn.textContent = "Spin";
      status.textContent = `${this.activeNames.length}/${this.names.length}`;
    }
  }

  showEditor() {
    this.isEditing = true;
    const editor = this.overlay.querySelector(".steel-editor");
    const controls = this.overlay.querySelector(".steel-controls");
    const namesList = this.overlay.querySelector(".steel-names-list");

    // Build clickable list of names
    namesList.innerHTML = this.names
      .map((name) => {
        const isActive = this.activeNames.includes(name);
        return `<div class="steel-name-item ${isActive ? "" : "steel-name-disabled"}" data-name="${name}">${name}</div>`;
      })
      .join("");

    // Add click handlers
    namesList.querySelectorAll(".steel-name-item").forEach((item) => {
      item.addEventListener("click", () => this.toggleName(item));
    });

    editor.style.display = "block";
    controls.style.display = "none";
  }

  async toggleName(item) {
    const name = item.dataset.name;
    const isDisabled = item.classList.contains("steel-name-disabled");

    if (isDisabled) {
      // Enable: add to activeNames
      if (!this.activeNames.includes(name)) {
        this.activeNames.push(name);
      }
      item.classList.remove("steel-name-disabled");
    } else {
      // Disable: remove from activeNames
      this.activeNames = this.activeNames.filter((n) => n !== name);
      item.classList.add("steel-name-disabled");
    }

    await this.saveNames();

    if (this.wheel) {
      this.wheel.setNames(this.activeNames);
    }

    this.updateUI();
  }

  hideEditor() {
    this.isEditing = false;
    const editor = this.overlay.querySelector(".steel-editor");
    const controls = this.overlay.querySelector(".steel-controls");

    editor.style.display = "none";
    controls.style.display = "flex";
  }

  async resetList() {
    this.activeNames = [...this.names];
    this.lastWinner = null;
    this.pendingRemoval = null;
    await this.saveNames();

    if (this.wheel) {
      this.wheel.setHighlight(null);
      this.wheel.setNames(this.activeNames);
    }

    this.updateUI();
    this.clearResult();
  }

  clearResult() {
    const result = this.overlay.querySelector(".steel-result");
    if (result) result.style.display = "none";
  }

  async handleSpinEnd(winner, index) {
    // Show result
    const result = this.overlay.querySelector(".steel-result");
    const resultName = this.overlay.querySelector(".steel-result-name");

    result.style.display = "block";
    resultName.textContent = winner;

    // Save last winner and mark for pending removal (don't remove yet)
    this.lastWinner = winner;
    this.pendingRemoval = winner;
    await this.saveNames();

    // Highlight the winner on the wheel
    if (this.wheel) {
      this.wheel.setHighlight(winner);
    }

    this.updateUI();

    // Notify parent to click the filter
    this.onWinnerSelected(winner);
  }

  async removePendingWinner() {
    if (!this.pendingRemoval) return;

    // Remove pending winner from active list
    this.activeNames = this.activeNames.filter(
      (name) => name !== this.pendingRemoval,
    );
    this.pendingRemoval = null;
    await this.saveNames();

    // Update wheel and clear highlight
    if (this.wheel) {
      this.wheel.setHighlight(null);
      this.wheel.setNames(this.activeNames);
    }

    this.updateUI();
  }

  destroy() {
    if (this.handleKeyDown) {
      document.removeEventListener("keydown", this.handleKeyDown);
    }
    this.hide();
  }
}

// Export for use in other scripts
window.SteelOverlay = SteelOverlay;
