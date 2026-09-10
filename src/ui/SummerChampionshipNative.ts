// Desativado: o MainMenu.ts e ChampionshipPreview.ts controlam o fluxo da Copa Verão.
// Manter este módulo sem listeners evita MutationObserver e filtros duplicados disputando o mesmo estado.
export function installSummerChampionshipNative(): void {
  // no-op intencional
}
