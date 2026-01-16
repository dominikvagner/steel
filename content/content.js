// Steel - Main Content Script
// Orchestrates the wheel overlay and Jira integration

(function() {
  'use strict';
  
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
    return `board-${window.location.pathname.replace(/[^a-zA-Z0-9]/g, '-')}`;
  }
  
  // Find and click Jira quick filter buttons
  function clickPersonFilter(name) {
    // Find all quick filter buttons
    const filterButtons = document.querySelectorAll('a.js-quickfilter-button.aui-button-link');
    
    if (filterButtons.length === 0) {
      console.log('Steel: No quick filter buttons found');
      showNotification(`Could not find filter buttons on this board`);
      return false;
    }
    
    // First, deselect any currently selected filters
    filterButtons.forEach(btn => {
      if (btn.getAttribute('aria-pressed') === 'true') {
        btn.click();
      }
    });
    
    // Small delay before selecting the new filter
    setTimeout(() => {
      // Find the button matching the winner's name (case-insensitive)
      const matchingButton = Array.from(filterButtons).find(btn => {
        const buttonText = btn.textContent.trim().toLowerCase();
        return buttonText === name.toLowerCase();
      });
      
      if (matchingButton) {
        matchingButton.click();
        console.log(`Steel: Selected filter for "${name}"`);
        showNotification(`Selected: ${name}`);
      } else {
        console.log(`Steel: Could not find filter button for "${name}"`);
        showNotification(`Could not find filter for "${name}"`);
      }
    }, 100);
    
    return true;
  }
  
  // Show a temporary notification
  function showNotification(message) {
    const existing = document.querySelector('.steel-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'steel-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('steel-notification-fade');
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  }
  
  // Create the floating trigger button
  function createTriggerButton() {
    if (triggerButton) return;
    
    triggerButton = document.createElement('button');
    triggerButton.className = 'steel-trigger-btn';
    triggerButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        <circle cx="12" cy="12" r="5"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
    `;
    triggerButton.title = 'Steel - Spin the wheel (Alt+Shift+W)';
    
    triggerButton.addEventListener('click', () => {
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
        console.log('Steel: Overlay closed');
      }
    });
  }
  
  // Handle messages from background script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'toggle-wheel':
        if (overlay) overlay.toggle();
        break;
        
      case 'open-wheel':
        if (overlay) overlay.show();
        break;
        
      case 'get-board-info':
        sendResponse({
          isJiraBoard: true,
          boardId: getBoardId(),
          url: window.location.href
        });
        return true;
        
      default:
        break;
    }
  });
  
  // Initialize when DOM is ready
  function init() {
    console.log('Steel: Initializing on', window.location.href);
    createTriggerButton();
    initOverlay();
  }
  
  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
