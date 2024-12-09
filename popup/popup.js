document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['apiKey'], (result) => {
    if (result.apiKey) {
      document.getElementById('apiKey').value = result.apiKey;
    }
  });

  document.getElementById('saveButton').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value;
    chrome.storage.sync.set({ apiKey }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Configuration sauvegardée!';
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    });
  });
}); 