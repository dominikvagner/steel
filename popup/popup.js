// Steel - Popup Script
// Manages name configuration and communication with content script

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const contentEl = document.getElementById('content');
  const notJiraEl = document.getElementById('not-jira');
  const namesInput = document.getElementById('names-input');
  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');
  const openWheelBtn = document.getElementById('open-wheel-btn');
  
  let currentBoardId = null;
  let boardData = { names: [], activeNames: [] };
  
  // Check if we're on a Jira board
  async function checkCurrentPage() {
    try {
      const response = await browser.runtime.sendMessage({ action: 'get-board-info' });
      
      if (response && response.isJiraBoard) {
        currentBoardId = response.boardId;
        await loadBoardData();
        showContent();
      } else {
        showNotJira();
      }
    } catch (error) {
      console.error('Steel popup: Error checking page:', error);
      showNotJira();
    }
  }
  
  // Load saved data for this board
  async function loadBoardData() {
    if (!currentBoardId) return;
    
    const storageKey = `board:${currentBoardId}`;
    try {
      const result = await browser.storage.local.get(storageKey);
      boardData = result[storageKey] || { names: [], activeNames: [] };
      
      namesInput.value = boardData.names.join('\n');
    } catch (error) {
      console.error('Steel popup: Error loading data:', error);
    }
  }
  
  // Save names for this board
  async function saveNames() {
    if (!currentBoardId) return;
    
    const newNames = namesInput.value
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    // If names changed, reset active list
    const namesChanged = JSON.stringify(newNames) !== JSON.stringify(boardData.names);
    
    boardData.names = newNames;
    if (namesChanged) {
      boardData.activeNames = [...newNames];
    }
    
    const storageKey = `board:${currentBoardId}`;
    try {
      await browser.storage.local.set({ [storageKey]: boardData });
      showSaveConfirmation();
    } catch (error) {
      console.error('Steel popup: Error saving data:', error);
    }
  }
  
  // Reset active list to full list
  async function resetActiveList() {
    if (!currentBoardId) return;
    
    boardData.activeNames = [...boardData.names];
    
    const storageKey = `board:${currentBoardId}`;
    try {
      await browser.storage.local.set({ [storageKey]: boardData });
      showResetConfirmation();
    } catch (error) {
      console.error('Steel popup: Error resetting data:', error);
    }
  }
  
  // Open the wheel on the current page
  async function openWheel() {
    try {
      await browser.runtime.sendMessage({ action: 'open-wheel-from-popup' });
      window.close();
    } catch (error) {
      console.error('Steel popup: Error opening wheel:', error);
    }
  }
  

  
  // Show save confirmation
  function showSaveConfirmation() {
    saveBtn.textContent = 'OK!';
    saveBtn.classList.add('success');
    setTimeout(() => {
      saveBtn.textContent = 'Save';
      saveBtn.classList.remove('success');
    }, 1000);
  }
  
  // Show reset confirmation
  function showResetConfirmation() {
    resetBtn.textContent = 'OK!';
    resetBtn.classList.add('success');
    setTimeout(() => {
      resetBtn.textContent = 'Reset';
      resetBtn.classList.remove('success');
    }, 1000);
  }
  
  // UI state functions
  function showContent() {
    statusEl.style.display = 'none';
    notJiraEl.style.display = 'none';
    contentEl.style.display = 'block';
  }
  
  function showNotJira() {
    statusEl.style.display = 'none';
    contentEl.style.display = 'none';
    notJiraEl.style.display = 'block';
  }
  
  // Event listeners
  saveBtn.addEventListener('click', saveNames);
  resetBtn.addEventListener('click', resetActiveList);
  openWheelBtn.addEventListener('click', openWheel);
  
  // Keyboard shortcut in textarea
  namesInput.addEventListener('keydown', (e) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveNames();
    }
  });
  
  // Initialize
  await checkCurrentPage();
});
