const measurementId = document.querySelector('meta[name="ga4-measurement-id"]')?.content;
const pageLocation = document.querySelector('link[rel="canonical"]')?.href;

function gtag() {
  (window.dataLayer ??= []).push(arguments);
}

if (measurementId) {
  gtag('js', new Date());
  gtag('config', measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: pageLocation,
    page_referrer: document.referrer ? new URL(document.referrer).origin : '',
  });
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.append(tag);
}

const walkthroughShortcut = document.getElementById('walkthrough-shortcut');
if (walkthroughShortcut) {
  const walkthrough = document.querySelector('.walkthrough');
  const openWalkthrough = () => { walkthrough.open = true; };
  const openLinkedWalkthrough = () => {
    if (location.hash === walkthroughShortcut.hash) openWalkthrough();
  };
  walkthroughShortcut.addEventListener('click', openWalkthrough);
  window.addEventListener('hashchange', openLinkedWalkthrough);
  openLinkedWalkthrough();
}

for (const button of document.querySelectorAll('[data-copy]')) {
  const label = button.textContent;
  const element = document.getElementById(button.dataset.copy);
  const status = document.getElementById(button.dataset.copyStatus ?? 'copy-status');
  const isStarterPrompt = element.id === 'prompt';
  let resetLabel;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(element.textContent);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      element.scrollIntoView({ block: 'center' });
      const fallbackStatus = isStarterPrompt ? document.getElementById('setup-copy-status') : status;
      fallbackStatus.textContent = 'Text selected. Use your keyboard to copy it.';
      return;
    }
    status.textContent = isStarterPrompt ? 'Copied. Paste into Codex or Claude Code.' : button.dataset.copyMessage;
    button.textContent = 'Copied';
    clearTimeout(resetLabel);
    resetLabel = setTimeout(() => { button.textContent = label; }, 1600);
    if (measurementId && isStarterPrompt && button.dataset.position) {
      gtag('event', 'starter_prompt_copy', {
        page_location: pageLocation,
        button_position: button.dataset.position,
      });
    }
  });
}
