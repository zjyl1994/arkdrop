export const VIEW_MODE_STORAGE_KEY = 'arkdrop-view-mode';
export const LIST_CACHE_KEY_PREFIX = 'arkdrop-list-cache:';

export const getListCacheKey = (scope) => `${LIST_CACHE_KEY_PREFIX}${scope}`;

export const clearArkDropStorage = () => {
  try {
    const keysToRemove = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && (key === VIEW_MODE_STORAGE_KEY || key.startsWith(LIST_CACHE_KEY_PREFIX))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear local storage cache', error);
  }
};

export const clearArkDropPWACaches = async () => {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    const cacheKeys = await caches.keys();

    await Promise.all(
      cacheKeys.map((cacheKey) => caches.delete(cacheKey))
    );
  } catch (error) {
    console.warn('Failed to clear PWA caches', error);
  }
};

export const clearArkDropClientCache = async () => {
  clearArkDropStorage();
  await clearArkDropPWACaches();
};
