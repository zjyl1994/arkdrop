export const VIEW_MODE_STORAGE_KEY = 'arkdrop-view-mode';
export const LIST_CACHE_KEY_PREFIX = 'arkdrop-list-cache:';
export const ERUDA_STORAGE_KEY = 'arkdrop-eruda-enabled';

export const getListCacheKey = (scope) => `${LIST_CACHE_KEY_PREFIX}${scope}`;

export const clearArkDropStorage = () => {
  try {
    const keysToRemove = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && (key === VIEW_MODE_STORAGE_KEY || key === ERUDA_STORAGE_KEY || key.startsWith(LIST_CACHE_KEY_PREFIX))) {
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
      cacheKeys.filter((key) => key.startsWith('arkdrop-')).map((key) => caches.delete(key))
    );
  } catch (error) {
    console.warn('Failed to clear PWA caches', error);
  }
};

export const clearArkDropClientCache = async () => {
  clearArkDropStorage();
  await clearArkDropPWACaches();
};

// Cached metadata is a brief fallback, never a permanent file archive.
export const LIST_CACHE_MAX_AGE = 15 * 60 * 1000;
export const filterUnexpired = (list, expireSeconds, now = Date.now()) => list.filter(
  (item) => item.favorite || !expireSeconds || (item.created_at + expireSeconds) * 1000 > now
);

export const clearListCaches = () => {
  try {
    Object.keys(localStorage).filter((key) => key.startsWith(LIST_CACHE_KEY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear list cache', error);
  }
};

export const pruneListCaches = (now = Date.now()) => {
  try {
    Object.keys(localStorage).filter((key) => key.startsWith(LIST_CACHE_KEY_PREFIX)).forEach((key) => {
      try {
        const cached = JSON.parse(localStorage.getItem(key));
        if (!cached?.updatedAt || now - cached.updatedAt >= LIST_CACHE_MAX_AGE) {
          localStorage.removeItem(key);
          return;
        }
        cached.list = filterUnexpired(cached.list || [], cached.expireSeconds || 0, now);
        localStorage.setItem(key, JSON.stringify(cached));
      } catch {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to prune temporary cache', error);
  }
};
