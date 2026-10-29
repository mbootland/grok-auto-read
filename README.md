# Grok Auto Read-Aloud

A tiny Chrome extension (Manifest V3) for [grok.com](https://grok.com) that turns Grok into a hands-free voice chat:

1. You send a message.
2. When Grok's reply finishes, the extension opens the reply's **⋯** menu and clicks **Read Aloud** for you.
3. When the read-aloud player closes, it opens **Dictation** so you can answer by voice right away.

Click the toolbar icon to turn the auto-Dictation step on or off. The badge shows **MIC** when it's on. Read Aloud always runs.

## Install

The extension isn't on the Chrome Web Store, so load it unpacked:

1. Download this repo (**Code → Download ZIP**, then unzip) or `git clone https://github.com/mbootland/grok-auto-read.git`.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the folder that contains `manifest.json`.
4. Open or reload a tab on grok.com.

Works in Chrome and other Chromium browsers (Edge, Brave, Arc).

## How it works

- `content.js` runs on `https://grok.com/*`. Pressing Enter in the composer or clicking the send button "arms" it.
- Once the page has been quiet for 2 seconds and a new reply's **⋯** button exists, it opens that menu and clicks **Read Aloud**.
- It watches for the read-aloud player to appear and then disappear, then clicks the Dictation (microphone) button. If no player shows up within 20 seconds, it skips Dictation.
- `bg.js` handles the toolbar toggle and stores the setting in `chrome.storage.local`.

The only permission is `storage`. Nothing is sent anywhere; there's no network code at all.

## Debugging

Open DevTools on grok.com and filter the console by `[AutoRead]` to see what it's doing (`armed`, `clicked Read Aloud`, `mic clicked`, and so on).

Grok's UI changes from time to time. If it stops working, the selectors near the top of `content.js` (the ⋯ icon, the "Read Aloud" menu item, the player and Dictation buttons) are the first place to look. Issues and PRs are welcome.

## Disclaimer

This is an unofficial, community project and isn't affiliated with or endorsed by xAI or Grok.

## License

[MIT](LICENSE)
