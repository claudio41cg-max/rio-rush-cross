import { getActiveDifficulty, loadChampionship } from './core/championship';

/**
 * Small compatibility guard for the five-stage Copa Verão.
 *
 * The older practice-unlock hotfix intentionally keeps conquered tracks playable,
 * but a card can keep the `conquered` class when it later becomes the current
 * official championship stage. In that state the practice click handler wins and
 * clears the championship session, so the result screen shows CORRER DE NOVO and
 * returns to free race. This guard makes the current stage unambiguously official.
 */
function syncOfficialStageVsPractice(): void {
  const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('.rc-summer-track'));
  if (cards.length === 0) {
    requestAnimationFrame(syncOfficialStageVsPractice);
    return;
  }

  const difficulty = getActiveDifficulty() ?? 'easy';
  const cup = loadChampionship(difficulty);

  cards.forEach((card, index) => {
    const result = cup.results.find((entry) => entry.stage === index);
    const current = !cup.completed && !result && index === cup.currentStage;
    const status = card.querySelector<HTMLElement>('.rc-stage-status');

    if (current) {
      // Critical: the official stage must never be intercepted by the practice
      // handler from rc-hotfix.ts.
      card.classList.remove('conquered', 'locked', 'completed');
      card.classList.add('current');
      card.disabled = false;
      card.setAttribute('aria-disabled', 'false');
      if (status) status.textContent = '▶ ETAPA OFICIAL';
      return;
    }

    card.classList.remove('current');

    if (result) {
      // Already completed stages stay playable as practice, but are clearly
      // labelled so the player knows they do not advance the current cup.
      card.classList.add('completed', 'conquered');
      card.classList.remove('locked');
      card.disabled = false;
      card.setAttribute('aria-disabled', 'false');
      if (status) status.textContent = '✓ CONCLUÍDA · TREINO';
      return;
    }

    // If the permanent-unlock layer exposed another conquered track, keep it as
    // practice only and label it explicitly. Locked future tracks remain locked.
    if (card.classList.contains('conquered')) {
      card.disabled = false;
      card.classList.remove('locked');
      card.setAttribute('aria-disabled', 'false');
      if (status) status.textContent = '✓ LIBERADA · TREINO';
    }
  });

  requestAnimationFrame(syncOfficialStageVsPractice);
}

requestAnimationFrame(syncOfficialStageVsPractice);
