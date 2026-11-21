const viewButtons = [...document.querySelectorAll('[data-view]')];
const raw = document.querySelector('#raw');
const clean = document.querySelector('#clean');
const demo = document.querySelector('#demo');
const demoLabel = document.querySelector('#demo-label');
const progress = document.querySelector('#demo-progress');
const command = document.querySelector('#install-command');
const status = document.querySelector('#copy-status');
let timers = [];

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

demo.addEventListener('click', () => {
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

for (const input of document.querySelectorAll('input[name="agent"]')) {
  input.addEventListener('change', () => {
    command.textContent = 'npx skills add andrewpeluso/transcript-deck --skill yt-structure -g -a ' + input.value;
  });
}

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const element = document.getElementById(button.dataset.copy);
    try {
      await navigator.clipboard.writeText(element.textContent);
      status.textContent = element === command ? 'Install command copied.' : 'Sample prompt copied.';
      button.textContent = 'Copied';
      clearTimeout(button.resetLabel);
      button.resetLabel = setTimeout(() => { button.textContent = 'Copy'; }, 1600);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = 'Text selected. Use your keyboard to copy it.';
    }
  });
}
