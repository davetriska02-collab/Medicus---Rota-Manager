// Medicus Rota Manager — service worker.
// The app lives in a full tab (rota grids need width); the action button
// focuses an existing app tab or opens a new one.

const APP_URL = chrome.runtime.getURL('app/app.html');

chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: APP_URL });
  if (tabs.length) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: APP_URL });
  }
});
