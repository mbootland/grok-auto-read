// Grok Auto Read-Aloud: when a new Grok reply finishes, opens its "..." menu and clicks "Read Aloud".
// When the read-aloud player closes, it can open Dictation so you can answer by voice (toggle via the toolbar icon).
(() => {
  const log = (...a) => console.log('[AutoRead]', ...a);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const QUIET_MS = 2000;         // DOM must be quiet this long before a reply counts as finished
  const ARM_TIMEOUT_MS = 180000; // stop waiting for a reply after 3 minutes
  const PLAYER_TIMEOUT_MS = 20000;
  const MAX_READ_MS = 600000;

  let armed = false, armedAt = 0, busy = false, baseLast = null;
  let lastMutation = 0, micRun = 0;
  let playing = false, lastPlay = 0;

  // Selectors for Grok's UI (may need updating if grok.com changes).
  const moreButtons = () => [...document.querySelectorAll('g[id="name=more-dots-hor"]')]
    .map(g => g.closest('button,[role="button"]')).filter(Boolean);
  const findReadAloud = () => [...document.querySelectorAll('[role="menuitem"]')]
    .find(el => /^\s*read aloud\s*$/i.test(el.textContent || ''));
  const micButton = () => document.querySelector('button[aria-label^="Dictation"]')
    || document.querySelector('g[id="name=microphone"]')?.closest('button') || null;
  const playerVisible = () => !!document.querySelector('button[aria-label="Playback rate"],button[aria-label="Stop"] g[id="name=close-md"]');

  // Radix-style menus open on pointerdown, so fire the full pointer/mouse sequence.
  const press = el => {
    const o = { bubbles: true, cancelable: true, view: window, button: 0, pointerType: 'mouse' };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new MouseEvent('mousedown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o));
    el.dispatchEvent(new MouseEvent('mouseup', o));
    el.dispatchEvent(new MouseEvent('click', o));
  };

  // Rough length of the reply text, used only to estimate reading time from audio events.
  const replyTextLength = btn => {
    let el = btn;
    for (let i = 0; i < 8 && el; i++, el = el.parentElement) {
      const n = (el.textContent || '').trim().length;
      if (n > 40) return n;
    }
    return 300;
  };

  const arm = () => {
    micRun++; // cancel any pending mic wait from the previous reply
    armed = true; armedAt = Date.now();
    const b = moreButtons();
    baseLast = b[b.length - 1] || null;
    log('armed');
  };

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.closest?.('textarea,[contenteditable]')) arm();
  }, true);
  document.addEventListener('click', e => {
    if (e.target.closest?.('button[type="submit"],button[aria-label*="Submit" i],button[aria-label*="Send" i]')) arm();
  }, true);

  // Track media playback in case Grok plays through an <audio> element.
  document.addEventListener('play', () => { playing = true; lastPlay = Date.now(); }, true);
  document.addEventListener('ended', () => { playing = false; }, true);
  document.addEventListener('pause', () => { playing = false; }, true);

  const openMicAfterSpeech = async textLen => {
    const run = ++micRun;
    const start = Date.now();
    const fallbackMs = Math.max(4000, textLen * 70); // ~14 chars/sec
    let sawPlayer = false, finished = false;
    log('waiting for reading to finish');
    while (Date.now() - start < MAX_READ_MS) {
      await wait(500);
      if (run !== micRun) return;
      if (playerVisible()) { if (!sawPlayer) log('reading started'); sawPlayer = true; continue; }
      if (sawPlayer) { finished = true; break; }
      const sawAudio = lastPlay >= start;
      if (sawAudio && !playing && Date.now() - lastPlay > 1000) { finished = true; break; }
      if (sawAudio && !playing && Date.now() - start > fallbackMs + 5000) { finished = true; break; }
      if (!sawAudio && Date.now() - start > PLAYER_TIMEOUT_MS) { log('player never appeared, skipping mic'); return; }
    }
    if (!finished) return;
    await wait(500);
    if (run !== micRun) return;
    const { autoMic } = await chrome.storage.local.get({ autoMic: true });
    if (!autoMic) { log('auto mic off'); return; }
    const m = micButton();
    if (m) { m.click(); log('mic clicked'); } else log('mic button not found');
  };

  const tryPlay = async () => {
    if (!armed || busy) return;
    if (Date.now() - lastMutation < QUIET_MS) return; // reply still streaming
    const btns = moreButtons();
    const last = btns[btns.length - 1];
    if (!last || last === baseLast) return;
    busy = true; armed = false;
    press(last);
    for (let i = 0; i < 15; i++) {
      await wait(100);
      const item = findReadAloud();
      if (item) {
        press(item);
        log('clicked Read Aloud');
        busy = false;
        openMicAfterSpeech(replyTextLength(last));
        return;
      }
    }
    log('Read Aloud item not found');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    busy = false;
  };

  new MutationObserver(() => { if (armed) lastMutation = Date.now(); })
    .observe(document.body, { childList: true, subtree: true, characterData: true });

  // Poll while armed so a reply whose "..." button appears late still gets picked up.
  setInterval(() => {
    if (!armed) return;
    if (Date.now() - armedAt > ARM_TIMEOUT_MS) { armed = false; log('gave up waiting for reply'); return; }
    tryPlay();
  }, 1000);

  log('loaded');
})();
