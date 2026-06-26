import { createContext, useContext, useMemo, useRef, useState } from 'react';
import ConfirmDialog from './components/ui/ConfirmDialog.jsx';

const ConfirmDialogContext = createContext(null);

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = ({ title, message, confirmLabel = 'Yes', cancelLabel = 'Cancel' }) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({ title, message, confirmLabel, cancelLabel });
    });
  };

  const handleClose = (confirmed) => {
    setDialog(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    if (typeof resolve === 'function') {
      resolve(confirmed);
    }
  };

  const value = useMemo(() => ({ confirm }), []);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={!!dialog}
        title={dialog?.title ?? 'Confirm'}
        message={dialog?.message ?? 'Are you sure?'}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        onConfirm={() => handleClose(true)}
        onCancel={() => handleClose(false)}
      />
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }
  return context.confirm;
}
