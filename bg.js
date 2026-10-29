// Toolbar icon toggles whether Dictation opens automatically after a reply is read aloud.
const render = on => {
  chrome.action.setBadgeText({ text: on ? 'MIC' : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#2a7' });
  chrome.action.setTitle({ title: 'Auto mic: ' + (on ? 'ON' : 'OFF') + ' (click to toggle)' });
};
const refresh = () => chrome.storage.local.get({ autoMic: true }, r => render(r.autoMic));

refresh();
chrome.runtime.onStartup.addListener(refresh);
chrome.runtime.onInstalled.addListener(refresh);
chrome.action.onClicked.addListener(() =>
  chrome.storage.local.get({ autoMic: true }, r => {
    const v = !r.autoMic;
    chrome.storage.local.set({ autoMic: v });
    render(v);
  }));
