// Steel - Background Service Worker
// Handles keyboard commands and messaging between popup and content scripts

// Listen for keyboard command
browser.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-wheel') {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await browser.tabs.sendMessage(tab.id, { action: 'toggle-wheel' });
      }
    } catch (error) {
      console.error('Steel: Failed to send toggle command:', error);
    }
  }
});

// Listen for messages from popup
browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === 'open-wheel-from-popup') {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await browser.tabs.sendMessage(tab.id, { action: 'open-wheel' });
        return { success: true };
      }
    } catch (error) {
      console.error('Steel: Failed to open wheel from popup:', error);
      return { success: false, error: error.message };
    }
  }
  
  if (message.action === 'get-board-info') {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const response = await browser.tabs.sendMessage(tab.id, { action: 'get-board-info' });
        return response;
      }
    } catch (error) {
      return { isJiraBoard: false };
    }
  }
  
  return false;
});
