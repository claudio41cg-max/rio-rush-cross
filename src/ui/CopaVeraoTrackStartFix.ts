/*
 * Copa Verão hotfix: the cup track is selected BEFORE character select.
 * A capture listener prevents the legacy track-card handler from running,
 * which was freezing the menu when a Copa Verão track was tapped.
 */
const SUMMER_SELECTOR = '.rc-summer-track';

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>(SUMMER_SELECTOR);
  if (!button) return;

  const panel = button.closest<HTMLElement>('.rc-summer-cup');
  if (!panel || panel.classList.contains('hidden')) return;

  const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>(SUMMER_SELECTOR));
  const selectedIndex = buttons.indexOf(button);
  if (selectedIndex < 0 || selectedIndex > 2) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  sessionStorage.setItem('rc-championship', 'summer');
  document.body.classList.add('rc-summer-active');
  panel.classList.add('hidden');

  // MainMenu already owns the safe transition to characterSelect.
  // Its legacy listener clears rc-summer-race, so restore the chosen cup track
  // immediately after the synchronous event finishes.
  window.dispatchEvent(new Event('rc:start-summer-cup'));
  sessionStorage.setItem('rc-summer-race', String(selectedIndex));
}, true);
