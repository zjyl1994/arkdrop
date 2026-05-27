export const ERUDA_STORAGE_KEY = 'arkdrop-eruda-enabled';

let erudaModulePromise = null;
let erudaActive = false;

const canUseEruda = () => typeof window !== 'undefined';

const loadEruda = async () => {
  if (!erudaModulePromise) {
    erudaModulePromise = import('eruda').then((module) => module.default ?? module);
  }

  return erudaModulePromise;
};

export const isErudaEnabled = () => {
  if (!canUseEruda()) {
    return false;
  }

  return localStorage.getItem(ERUDA_STORAGE_KEY) === '1';
};

const persistErudaState = (enabled) => {
  if (!canUseEruda()) {
    return;
  }

  localStorage.setItem(ERUDA_STORAGE_KEY, enabled ? '1' : '0');
};

export const setErudaEnabled = async (enabled) => {
  if (!canUseEruda()) {
    return false;
  }

  persistErudaState(enabled);

  if (enabled) {
    const eruda = await loadEruda();

    if (!erudaActive) {
      eruda.init();
      erudaActive = true;
    }

    return true;
  }

  if (erudaActive) {
    const eruda = await loadEruda();
    eruda.destroy();
    erudaActive = false;
  }

  return false;
};

export const toggleErudaEnabled = async () => setErudaEnabled(!isErudaEnabled());

export const syncErudaState = async () => {
  if (!isErudaEnabled()) {
    return false;
  }

  return setErudaEnabled(true);
};
