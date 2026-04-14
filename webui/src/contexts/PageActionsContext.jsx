import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const emptyPageActions = {
  hasPageActions: false,
  viewMode: 'list',
  cleanLabel: '',
  onToggleView: null,
  onClean: null,
};

const PageActionsContext = createContext({
  pageActions: emptyPageActions,
  setPageActions: () => {},
  resetPageActions: () => {},
});

export function PageActionsProvider({ children }) {
  const [pageActions, setPageActions] = useState(emptyPageActions);

  const resetPageActions = useCallback(() => {
    setPageActions(emptyPageActions);
  }, []);

  const value = useMemo(() => ({
    pageActions,
    setPageActions,
    resetPageActions,
  }), [pageActions, resetPageActions]);

  return (
    <PageActionsContext.Provider value={value}>
      {children}
    </PageActionsContext.Provider>
  );
}

export function usePageActions() {
  return useContext(PageActionsContext);
}
