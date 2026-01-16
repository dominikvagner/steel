// Steel - Wheel Component
// Canvas-based spinning wheel with animation

class SteelWheel {
  constructor(container, options = {}) {
    this.container = container;
    this.names = options.names || [];
    this.size = options.size || 230;
    this.onSpinEnd = options.onSpinEnd || (() => {});
    
    this.canvas = null;
    this.ctx = null;
    this.rotation = 0;
    this.isSpinning = false;
    this.spinStartTime = null;
    this.spinDuration = 4500; // 4.5 seconds
    this.targetRotation = 0;
    
    // Vibrant colors with good white text contrast
    this.colors = [
      '#E53935', // Red
      '#8E24AA', // Purple
      '#3949AB', // Indigo
      '#00897B', // Teal
      '#43A047', // Green
      '#F4511E', // Deep orange
      '#6D4C41', // Brown
      '#5E35B1', // Deep purple
      '#1E88E5', // Blue
      '#00ACC1', // Cyan (darker)
      '#7CB342', // Light green (darker)
      '#C0CA33', // Lime (darker)
    ];
    
    this.init();
  }
  
  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.className = 'steel-wheel-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
    
    // Click to spin
    this.canvas.addEventListener('click', () => this.spin());
    
    // Keyboard support
    this.canvas.setAttribute('tabindex', '0');
    this.canvas.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
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
  
  render() {
    const ctx = this.ctx;
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const radius = this.size / 2 - 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, this.size, this.size);
    
    if (this.names.length === 0) {
      this.renderEmpty();
      return;
    }
    
    const segmentAngle = (2 * Math.PI) / this.names.length;
    
    // Draw segments
    this.names.forEach((name, index) => {
      const startAngle = this.rotation + index * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;
      
      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = this.colors[index % this.colors.length];
      ctx.fill();
      
      // Draw border only if more than one segment
      if (this.names.length > 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    
    // Draw text separately (on top of all segments)
    this.names.forEach((name, index) => {
      const startAngle = this.rotation + index * segmentAngle - Math.PI / 2;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      
      // For single name, center the text
      if (this.names.length === 1) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold 11px monospace`;
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        const displayName = name.length > 12 ? name.substring(0, 11) + '..' : name;
        ctx.fillText(displayName, 0, -radius / 2);
      } else {
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${this.calculateFontSize()}px monospace`;
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Truncate name based on available space
        const maxLength = 10;
        const displayName = name.length > maxLength 
          ? name.substring(0, maxLength - 1) + '..' 
          : name;
        
        ctx.fillText(displayName, radius - 12, 0);
      }
      ctx.restore();
    });
    
    // Draw center circle (smaller)
    const centerRadius = Math.max(8, this.size / 18);
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#222';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw pointer (top)
    this.drawPointer();
  }
  
  renderEmpty() {
    const ctx = this.ctx;
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const radius = this.size / 2 - 10;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#3a3a3a';
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No names', centerX, centerY - 8);
    ctx.fillText('Click Edit', centerX, centerY + 8);
  }
  
  drawPointer() {
    const ctx = this.ctx;
    const centerX = this.size / 2;
    const pointerSize = Math.max(12, this.size / 12);
    
    ctx.beginPath();
    ctx.moveTo(centerX - pointerSize / 2, 3);
    ctx.lineTo(centerX + pointerSize / 2, 3);
    ctx.lineTo(centerX, pointerSize + 3);
    ctx.closePath();
    ctx.fillStyle = '#ff0044';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
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
  
  spin() {
    if (this.isSpinning || this.names.length === 0) return;
    
    // For single name, just select it immediately
    if (this.names.length === 1) {
      this.onSpinEnd(this.names[0], 0);
      return;
    }
    
    this.isSpinning = true;
    this.spinStartTime = performance.now();
    this.startRotation = this.rotation;
    
    // Random number of full rotations (3-5) plus random final position
    const fullRotations = 3 + Math.random() * 2;
    const randomOffset = Math.random() * 2 * Math.PI;
    this.targetRotation = this.rotation + fullRotations * 2 * Math.PI + randomOffset;
    
    this.canvas.style.cursor = 'default';
    this.animate();
  }
  
  animate() {
    const now = performance.now();
    const elapsed = now - this.spinStartTime;
    const progress = Math.min(elapsed / this.spinDuration, 1);
    
    // Cubic ease-out for natural deceleration
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    // Simple linear interpolation from start to target
    this.rotation = this.startRotation + (this.targetRotation - this.startRotation) * easeOut;
    
    this.render();
    
    if (progress < 1) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.rotation = this.targetRotation;
      this.isSpinning = false;
      this.canvas.style.cursor = 'pointer';
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
    const winnerIndex = (this.names.length - rawIndex - 1 + this.names.length) % this.names.length;
    
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
