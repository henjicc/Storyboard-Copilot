export interface GlobalErrorDialogDetail {
  title: string;
  message: string;
  details?: string;
  copyText?: string;
}

const OPEN_ERROR_DIALOG_EVENT = 'storyboard:open-error-dialog';

export function openGlobalErrorDialog(detail: GlobalErrorDialogDetail): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<GlobalErrorDialogDetail>(OPEN_ERROR_DIALOG_EVENT, { detail }));
}

export function subscribeOpenGlobalErrorDialog(
  callback: (detail: GlobalErrorDialogDetail) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<GlobalErrorDialogDetail>;
    callback(customEvent.detail);
  };

  window.addEventListener(OPEN_ERROR_DIALOG_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(OPEN_ERROR_DIALOG_EVENT, handler as EventListener);
  };
}
