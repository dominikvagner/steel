// Steel - Wheel Component
// Canvas-based spinning wheel with animation

class SteelWheel {
  constructor(container, options = {}) {
    this.container = container;
    this.names = options.names || [];
    this.size = options.size || 230;
    this.onSpinEnd = options.onSpinEnd || (() => {});
    this.onSpinStart = options.onSpinStart || (() => {});
    this.allSpun = false;

    this.canvas = null;
    this.ctx = null;
    this.rotation = 0;
    this.isSpinning = false;
    this.spinStartTime = null;
    this.spinDuration = 2500; // 2.5 seconds
    this.targetRotation = 0;
    this.highlightName = null;
    this.nameColors = {};

    // Flat UI colors from Default and Spanish palettes
    this.colors = [
      // Default Palette (darker colors only)
      "#1abc9c", // Turquoise
      "#16a085", // Green Sea
      "#2ecc71", // Emerald
      "#27ae60", // Nephritis
      "#3498db", // Peter River
      "#2980b9", // Belize Hole
      "#9b59b6", // Amethyst
      "#8e44ad", // Wisteria
      "#34495e", // Wet Asphalt
      "#2c3e50", // Midnight Blue
      "#f39c12", // Orange
      "#d35400", // Pumpkin
      "#e67e22", // Carrot
      "#e74c3c", // Alizarin
      "#c0392b", // Pomegranate
      // Spanish Palette (darker colors only)
      "#40407a", // Jacksons Purple
      "#706fd3", // Royal Blue
      "#34ace0", // Robins Egg Blue
      "#33d9b2", // Mint
      "#2c2c54", // Lucky Point
      "#474787", // Liberty
      "#227093", // Electron Blue
      "#218c74", // Pixelated Grass
      "#ff5252", // Radiant Yellow
      "#ff793f", // Puffins Bill
      "#ffb142", // Casandora Yellow
      "#b33939", // Amour
      "#cd6133", // Dark Periwinkle
      "#cc8e35", // June Bud
    ];

    this.init();
  }

  init() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "steel-wheel-canvas";

    // Account for device pixel ratio for crisp rendering on high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.size * dpr;
    this.canvas.height = this.size * dpr;
    this.canvas.style.width = `${this.size}px`;
    this.canvas.style.height = `${this.size}px`;

    this.ctx = this.canvas.getContext("2d", { alpha: true });
    // Scale context to match device pixel ratio
    this.ctx.scale(dpr, dpr);

    // Enable better text rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";

    this.container.appendChild(this.canvas);

    // Click to spin
    this.canvas.addEventListener("click", () => this.spin());

    // Keyboard support
    this.canvas.setAttribute("tabindex", "0");
    this.canvas.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        this.spin();
      }
    });

    this.render();
  }

  setNames(names) {
    this.names = names;
    this.render();
  }

  setNameColors(nameColors) {
    this.nameColors = nameColors || {};
    this.render();
  }

  setHighlight(name) {
    this.highlightName = name;
    this.render();
  }

  setAllSpun(allSpun) {
    this.allSpun = allSpun;
    this.render();
  }

  render() {
    const ctx = this.ctx;
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const radius = this.size / 2 - 5; // Reduced margin for more space

    // Calculate safe zone to avoid pointer overlap - constant safe zone
    const centerRadius = Math.max(20, this.size / 9);
    const pointerHeight = Math.max(10, this.size / 23);
    const safeZoneRadius = centerRadius + pointerHeight + 6; // Constant 6px padding

    // Clear canvas
    ctx.clearRect(0, 0, this.size, this.size);

    if (this.names.length === 0) {
      this.renderEmpty();
      return;
    }

    const segmentAngle = (2 * Math.PI) / this.names.length;

    // Draw segments (base colors only)
    const overlapRadians = 0.02; // Larger overlap to cover antialiasing gaps
    this.names.forEach((name, index) => {
      const startAngle = this.rotation + index * segmentAngle - Math.PI / 2 - overlapRadians / 2;
      const endAngle = startAngle + segmentAngle + overlapRadians;

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineTo(centerX, centerY);
      ctx.closePath();

      const baseColor = this.nameColors[name] || this.colors[index % this.colors.length];
      ctx.fillStyle = baseColor;
      ctx.fill();
    });

    // Draw text on top of all segments
    this.names.forEach((name, index) => {
      const startAngle = this.rotation + index * segmentAngle - Math.PI / 2;

      ctx.save();
      ctx.translate(centerX, centerY);

      // For single name, center the text in the middle of the circle
      if (this.names.length === 1) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(name, 0, 0);
      } else {
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";

        // Calculate available text space: from safe zone to outer edge
        const textEndPosition = radius - 10;
        const availableSpace = textEndPosition - safeZoneRadius;

        // Adjust font size based on available space
        const baseFontSize = this.calculateFontSize();
        const estimatedTextWidth = name.length * baseFontSize * 0.6; // Approx char width

        let adjustedFontSize = baseFontSize;
        if (estimatedTextWidth > availableSpace) {
          // Scale down font to fit in available space
          adjustedFontSize = Math.max(8, Math.floor((availableSpace / name.length) / 0.6));
        }

        ctx.font = `bold ${adjustedFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillText(name, Math.round(textEndPosition), 0);
      }
      ctx.restore();
    });

    // Draw dark overlay over entire wheel when there's a highlight
    if (this.highlightName) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fill();

      // Re-draw the winning segment on top to make it "float"
      const winnerIndex = this.names.indexOf(this.highlightName);
      if (winnerIndex >= 0) {
        const startAngle = this.rotation + winnerIndex * segmentAngle - Math.PI / 2 - overlapRadians / 2;
        const endAngle = startAngle + segmentAngle + overlapRadians;

        // Re-draw winning segment
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.lineTo(centerX, centerY);
        ctx.closePath();

        const baseColor = this.nameColors[this.highlightName] || this.colors[winnerIndex % this.colors.length];
        ctx.fillStyle = baseColor;
        ctx.fill();

        // Re-draw winning segment text
        ctx.save();
        ctx.translate(centerX, centerY);

        if (this.names.length === 1) {
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;
          ctx.fillStyle = "#fff";
          ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
          ctx.shadowBlur = 2;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          ctx.fillText(this.highlightName, 0, 0);
        } else {
          ctx.rotate(startAngle + segmentAngle / 2);
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";

          // Calculate available text space: from safe zone to outer edge
          const textEndPosition = radius - 10;
          const availableSpace = textEndPosition - safeZoneRadius;

          // Adjust font size based on available space
          const baseFontSize = this.calculateFontSize();
          const estimatedTextWidth = this.highlightName.length * baseFontSize * 0.6; // Approx char width

          let adjustedFontSize = baseFontSize;
          if (estimatedTextWidth > availableSpace) {
            // Scale down font to fit in available space
            adjustedFontSize = Math.max(8, Math.floor((availableSpace / this.highlightName.length) / 0.6));
          }

          ctx.font = `bold ${adjustedFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;
          ctx.fillStyle = "#fff";
          ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
          ctx.shadowBlur = 2;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;

          ctx.fillText(this.highlightName, Math.round(textEndPosition), 0);
        }
        ctx.restore();
      }
    }

    // Only draw pointer and center circle if more than one segment
    if (this.names.length > 1) {
      // Draw pointer first (so center circle shadow is on top)
      this.drawPointer();

      // Draw center circle with shadow (centerRadius already calculated at top of render)
      // Draw shadow
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();

      // Draw party popper emoji in the center
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const emojiSize = Math.max(16, centerRadius * 0.8);
      ctx.font = `${emojiSize}px Arial`;
      ctx.fillText("🎉", centerX, centerY);
      ctx.restore();
    }
  }

  renderEmpty() {
    const ctx = this.ctx;
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const radius = this.size / 2 - 5; // Reduced margin for more space

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = "#3a3a3a";
    ctx.fill();

    if (this.allSpun) {
      // All spun state - show "Full circle!" message, no center circle
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Full circle!", Math.round(centerX), Math.round(centerY));
    } else {
      // Truly empty state - show "No names" message
      ctx.fillStyle = "#888";
      ctx.font = "11px -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No names", Math.round(centerX), Math.round(centerY - 8));
      ctx.fillText("Click Edit", Math.round(centerX), Math.round(centerY + 8));

      // Draw center circle with shadow (only in truly empty state)
      const centerRadius = Math.max(20, this.size / 9);

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }
  }

  drawPointer() {
    const ctx = this.ctx;
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const centerRadius = Math.max(20, this.size / 9);

    // Small triangular pointer at the edge of center circle, pointing up
    const pointerWidth = Math.max(8, this.size / 28);
    const pointerHeight = Math.max(10, this.size / 23);

    // Position at top of center circle
    const pointerBaseY = centerY - centerRadius;
    const pointerTipY = pointerBaseY - pointerHeight;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    // Draw triangle
    ctx.beginPath();
    ctx.moveTo(centerX, pointerTipY); // Top point
    ctx.lineTo(centerX - pointerWidth / 2, pointerBaseY); // Bottom left
    ctx.lineTo(centerX + pointerWidth / 2, pointerBaseY); // Bottom right
    ctx.closePath();

    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
  }

  calculateFontSize() {
    const numNames = this.names.length;
    // Scale font based on wheel size and number of names
    const scaleFactor = this.size / 220;

    let baseSize;
    if (numNames <= 3) baseSize = 12;
    else if (numNames <= 5) baseSize = 11;
    else if (numNames <= 8) baseSize = 10;
    else baseSize = 9;

    return Math.round(baseSize * scaleFactor);
  }

  async spin() {
    if (this.isSpinning || this.names.length === 0) return;

    // Call onSpinStart callback before spinning and wait for it
    await this.onSpinStart();

    // For single name, just select it immediately
    if (this.names.length === 1) {
      this.onSpinEnd(this.names[0], 0);
      return;
    }

    this.isSpinning = true;
    this.spinStartTime = performance.now();
    this.startRotation = this.rotation;

    // Pick a random winner
    const randomWinnerIndex = Math.floor(Math.random() * this.names.length);
    const segmentAngle = (2 * Math.PI) / this.names.length;

    // Calculate rotation where winner segment is centered under the pointer
    // The pointer is at -π/2, segment i middle should align with it
    const winnerCenterRotation = -(randomWinnerIndex + 0.5) * segmentAngle;

    // Normalize to [0, 2π)
    const normalizedWinnerRotation = ((winnerCenterRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    // Add full rotations (3-5 spins)
    const fullRotations = 3 + Math.random() * 2;
    const baseTarget = this.rotation + fullRotations * 2 * Math.PI;

    // Calculate how many full rotations to add to reach just past baseTarget
    const cycles = Math.ceil((baseTarget - normalizedWinnerRotation) / (2 * Math.PI));
    this.targetRotation = normalizedWinnerRotation + cycles * 2 * Math.PI;

    this.canvas.style.cursor = "default";
    this.animate();
  }

  animate() {
    const now = performance.now();
    const elapsed = now - this.spinStartTime;
    const progress = Math.min(elapsed / this.spinDuration, 1);

    // Cubic ease-out for natural deceleration
    const easeOut = 1 - Math.pow(1 - progress, 3);

    // Simple linear interpolation from start to target
    this.rotation =
      this.startRotation + (this.targetRotation - this.startRotation) * easeOut;

    this.render();

    if (progress < 1) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.rotation = this.targetRotation;
      this.isSpinning = false;
      this.canvas.style.cursor = "pointer";
      this.onSpinComplete();
    }
  }

  onSpinComplete() {
    // Calculate which segment is at the top (under the pointer)
    const segmentAngle = (2 * Math.PI) / this.names.length;

    // Normalize rotation to 0 to 2*PI
    let normalizedRotation = this.rotation % (2 * Math.PI);
    if (normalizedRotation < 0) normalizedRotation += 2 * Math.PI;

    // The pointer is at the top (angle = -PI/2 in canvas coordinates)
    // Segment i spans from: (rotation + i * segmentAngle - PI/2) to (rotation + (i+1) * segmentAngle - PI/2)
    // At the pointer position (-PI/2), we need to find which segment contains it
    // Rearranging: i = floor((pointerAngle - rotation + PI/2) / segmentAngle)
    // Since pointer is at -PI/2 (or equivalently 3*PI/2):
    // i = floor((-PI/2 - rotation + PI/2) / segmentAngle) = floor(-rotation / segmentAngle)
    // To get positive index: (names.length - floor(rotation / segmentAngle) % names.length) % names.length

    const rawIndex = Math.floor(normalizedRotation / segmentAngle);
    const winnerIndex =
      (this.names.length - rawIndex - 1 + this.names.length) %
      this.names.length;

    const winner = this.names[winnerIndex];
    this.onSpinEnd(winner, winnerIndex);
  }

  destroy() {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// Export for use in other scripts
window.SteelWheel = SteelWheel;
