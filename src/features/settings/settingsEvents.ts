export type SettingsCategory = 'providers' | 'appearance' | 'general' | 'experimental' | 'about';

interface OpenSettingsEventDetail {
  category?: SettingsCategory;
}

const OPEN_SETTINGS_EVENT = 'storyboard:open-settings-dialog';

export function openSettingsDialog(detail: OpenSettingsEventDetail = {}): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<OpenSettingsEventDetail>(OPEN_SETTINGS_EVENT, { detail }));
}

export function subscribeOpenSettingsDialog(
  callback: (detail: OpenSettingsEventDetail) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<OpenSettingsEventDetail>;
    callback(customEvent.detail ?? {});
  };

  window.addEventListener(OPEN_SETTINGS_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(OPEN_SETTINGS_EVENT, handler as EventListener);
  };
}
