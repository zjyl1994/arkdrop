import { useRegisterSW } from 'virtual:pwa-register/react';
import { Alert, Button } from '@mui/material';
import { useUpload } from '../contexts/UploadContext';

export default function PWAUpdateNotice() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  const { pending } = useUpload();
  if (!needRefresh) return null;
  return <Alert severity="info" sx={{ position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 1500 }}
    action={<Button disabled={pending} onClick={() => void updateServiceWorker(true)}>更新</Button>}>
    {pending ? '新版本已就绪，请先完成或结束本次发送' : '新版本已就绪，更新将刷新页面'}
  </Alert>;
}
