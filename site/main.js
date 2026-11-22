const viewButtons = [...document.querySelectorAll('[data-view]')];
const raw = document.querySelector('#raw');
const clean = document.querySelector('#clean');
const demo = document.querySelector('#demo');
const demoLabel = document.querySelector('#demo-label');
const progress = document.querySelector('#demo-progress');
const status = document.querySelector('#copy-status');
const measurementId = document.querySelector('meta[name="ga4-measurement-id"]')?.content;
const pageLocation = document.querySelector('link[rel="canonical"]')?.href;
let timers = [];

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

function show(view) {
  raw.hidden = view !== 'raw';
  clean.hidden = view !== 'clean';
  for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === view));
}

function stopDemo() {
  for (const timer of timers) clearTimeout(timer);
  timers = [];
  demo.classList.remove('playing');
  demoLabel.textContent = 'Play 12-second demo';
  progress.classList.remove('running');
}

for (const button of viewButtons) {
  button.addEventListener('click', () => {
    stopDemo();
    show(button.dataset.view);
  });
}

demo?.addEventListener('click', () => {
  if (timers.length) {
    stopDemo();
    return;
  }
  show('raw');
  raw.scrollTop = 0;
  clean.scrollTop = 0;
  demo.classList.add('playing');
  demoLabel.textContent = 'Stop demo';
  progress.classList.add('running');
  timers = [setTimeout(() => show('clean'), 4200), setTimeout(stopDemo, 12000)];
});

for (const button of document.querySelectorAll('[data-copy]')) {
  const label = button.textContent;
  let resetLabel;
  button.addEventListener('click', async () => {
    const element = document.getElementById(button.dataset.copy);
    try {
      await navigator.clipboard.writeText(element.textContent);
      status.textContent = button.dataset.copyMessage ?? 'Starter prompt copied.';
      button.textContent = 'Copied';
      clearTimeout(resetLabel);
      resetLabel = setTimeout(() => { button.textContent = label; }, 1600);
      if (measurementId && element.id === 'prompt' && button.dataset.position) {
        gtag('event', 'starter_prompt_copy', {
          page_location: pageLocation,
          button_position: button.dataset.position,
        });
      }
    } catch {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      element.scrollIntoView({ block: 'center' });
      status.textContent = 'Text selected. Use your keyboard to copy it.';
    }
  });
}
