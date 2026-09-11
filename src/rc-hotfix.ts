type AudioRuntime = {
  update?: (dt: number, karts: readonly unknown[], playerKartId: number, camera: unknown) => void;
  stopMusic?: () => void;
  playMusic?: (track: 'menu' | 'race' | 'finalLap' | 'results' | 'none') => void;
};

type MenuRuntime = {
  currentPanel?: 'title' | 'characterSelect' | 'trackSelect';
  goTo?: (panel: 'title' | 'characterSelect' | 'trackSelect', sound: boolean) => void;
  start?: () => void;
};

type GameRuntime = {
  currentState?: string;
  mainMenu?: MenuRuntime;
  audio?: AudioRuntime;
};

function game(): GameRuntime | null {
  return ((window as unknown as { __turboKartRush?: GameRuntime }).__turboKartRush) ?? null;
}

function isOfficialSummerStageReady(): boolean {
  return sessionStorage.getItem('rc-championship') === 'summer' &&
    sessionStorage.getItem('rc-summer-race') !== null;
}

function installResultAudioGuard(): void {
  const g = game();
  const audio = g?.audio;
  if (!g || !audio?.update || !audio.playMusic || !audio.stopMusic) {
    window.setTimeout(installResultAudioGuard, 80);
    return;
  }

  const originalUpdate = audio.update.bind(audio);
  const originalPlayMusic = audio.playMusic.bind(audio);

  audio.update = (dt, karts, playerKartId, camera) => {
    if (g.currentState === 'results') {
      originalUpdate(0, [], -1, camera);
      return;
    }
    originalUpdate(dt, karts, playerKartId, camera);
  };

  audio.playMusic = (track) => {
    if (g.currentState === 'results' && track === 'results') {
      audio.stopMusic?.();
      return;
    }
    originalPlayMusic(track);
  };
}
installResultAudioGuard();

// Copa Verão one-flow: a pista oficial já foi escolhida no painel da Copa.
// Depois de escolher o carrinho, inicia essa corrida diretamente e não abre
// o seletor genérico de pistas de novo.
let flowPatched = false;
function installChampionshipOneFlow(): void {
  if (flowPatched) return;
  const menu = game()?.mainMenu;
  if (!menu?.goTo || !menu.start) {
    window.setTimeout(installChampionshipOneFlow, 80);
    return;
  }

  const originalGoTo = menu.goTo.bind(menu);
  const startSelectedRace = menu.start.bind(menu);

  menu.goTo = (panel, sound) => {
    if (
      panel === 'trackSelect' &&
      menu.currentPanel === 'characterSelect' &&
      isOfficialSummerStageReady()
    ) {
      startSelectedRace();
      return;
    }
    originalGoTo(panel, sound);
  };

  flowPatched = true;
}
installChampionshipOneFlow();
