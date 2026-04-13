import { createContext, useCallback, useContext, useState } from 'react';

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

  return (
    <PageActionsContext.Provider value={{ pageActions, setPageActions, resetPageActions }}>
      {children}
    </PageActionsContext.Provider>
  );
}

export function usePageActions() {
  return useContext(PageActionsContext);
}
