import { createContext, useContext, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Snackbar } from '@mui/material';
import CreatePostModal from '../components/CreatePostModal';

const UploadContext = createContext(null);
export const useUpload = () => useContext(UploadContext);

export function UploadProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [message, setMessage] = useState('');
  const location = useLocation();
  const openUpload = useCallback((nextFavorite = false) => {
    if (!pending) setFavorite(nextFavorite);
    setOpen(true);
  }, [pending]);
  return (
    <UploadContext.Provider value={{ openUpload, uploading, pending }}>
      {children}
      {location.pathname !== '/login' && <CreatePostModal
        open={open}
        handleClose={() => setOpen(false)}
        defaultFavorite={favorite}
        onUploadingChange={setUploading}
        onPendingChange={setPending}
        onSubmitSuccess={(text) => setMessage(text)}
      />}
      {pending && !open && location.pathname !== '/login' && <Button variant="contained" onClick={() => setOpen(true)}
        sx={{ position: 'fixed', bottom: 24, left: 16, zIndex: 1400 }}>{uploading ? '正在发送 · 查看进度' : '查看待发送内容'}</Button>}
      <Snackbar open={!!message} message={message} autoHideDuration={5000} onClose={() => setMessage('')} />
    </UploadContext.Provider>
  );
}
