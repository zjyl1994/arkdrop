import axios from 'axios';
import Fab from '@mui/material/Fab';
import { useTheme } from '@mui/material/styles';

// 导入CreatePostModal组件
import CreatePostModal from '../compoments/CreatePostModal';
import ConfirmDialog from '../compoments/ConfirmDialog';
import ImagePreviewModal from '../compoments/ImagePreviewModal';
import DataListItem from '../compoments/DataListItem';
import ImageGalleryView from '../compoments/ImageGalleryView';
import { usePageActions } from '../contexts/PageActionsContext';

const authRequestConfig = { withCredentials: true };

const defaultConfirmDialog = {
  open: false,
  title: '',
  message: '',
  confirmText: '确定',
  confirmColor: 'primary',
  onConfirm: null,
};

const defaultImagePreview = {
  open: false,
  src: '',
  alt: '',
};

const createConfirmDialogState = (overrides = {}) => ({
  ...defaultConfirmDialog,
  ...overrides,
});

const createImagePreviewState = (overrides = {}) => ({
  ...defaultImagePreview,
  ...overrides,
});

const HomePage = ({ scope = 'all' }) => {
  const { setPageActions, resetPageActions } = usePageActions();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const wsRef = useRef(null);
  const [listData, setListData] = useState([]);
  const [expireSeconds, setExpireSeconds] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    // Load saved view mode from localStorage, default to 'list'
    return localStorage.getItem('arkdrop-view-mode') || 'list';
  });
  const scopeRef = useRef(scope);
  const [confirmDialog, setConfirmDialog] = useState(defaultConfirmDialog);
  const [imagePreview, setImagePreview] = useState(defaultImagePreview);

  const getWithAuth = useCallback((url) => axios.get(url, authRequestConfig), []);
  const postWithAuth = useCallback((url, payload = {}) => axios.post(url, payload, authRequestConfig), []);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const closeSnackbar = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  }, []);

  const showMessage = useCallback((message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(defaultConfirmDialog);
  }, []);

  const openConfirmDialog = useCallback((overrides) => {
    setConfirmDialog(createConfirmDialogState({ open: true, ...overrides }));
  }, []);

  const openImagePreview = useCallback((src, alt) => {
    setImagePreview(createImagePreviewState({ open: true, src, alt }));
  }, []);

  const closeImagePreview = useCallback(() => {
    setImagePreview(defaultImagePreview);
  }, []);

  const fetchData = useCallback(async (nextScope = scopeRef.current) => {
    const query = nextScope === 'favorite' ? '?favorite=true' : '';

    try {
      const res = await getWithAuth(`/api/list${query}`);
      setListData(Array.isArray(res.data.list) ? res.data.list : []);
      setExpireSeconds(res.data.expire_seconds);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  }, [getWithAuth]);

  // Fetch existing data on page load
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/api/ws?echo=1`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.onmessage = (event) => {
      console.log('Received WebSocket message:', event.data);
      if (event.data === 'list_change') {
        fetchData();
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, [fetchData]);

  useEffect(() => {
    scopeRef.current = scope;
    fetchData(scope);
  }, [fetchData, scope]);

  const listChangeAction = useCallback(async (message, isError, shouldRefresh = !isError) => {
    if (shouldRefresh) {
      // Send message via WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send('list_change');
      } else {
        console.warn('WebSocket is not connected or closed, cannot send message.');
        await fetchData();
      }
    }

    // 如果有消息，则显示
    if (message) {
      showMessage(message);
    }
  }, [fetchData, showMessage]);

  const runListMutation = useCallback(async ({ request, successMessage, errorPrefix }) => {
    try {
      await request();
      if (successMessage) {
        showMessage(successMessage);
      }
      await listChangeAction();
    } catch (error) {
      showMessage(`${errorPrefix}: ${error.message}`);
    }
  }, [listChangeAction, showMessage]);

  // 处理收藏操作
  const handleFavorite = useCallback(async (id) => {
    await runListMutation({
      request: () => postWithAuth(`/api/favorite?id=${id}`),
      errorPrefix: '操作失败',
    });
  }, [postWithAuth, runListMutation]);

  // 处理删除操作
  const handleDelete = useCallback((id) => {
    openConfirmDialog({
      title: '确认删除',
      message: '确定要删除这条记录吗？',
      onConfirm: () => runListMutation({
        request: () => postWithAuth(`/api/delete?id=${id}`),
        successMessage: '删除成功',
        errorPrefix: '删除失败',
      })
    });
  }, [openConfirmDialog, postWithAuth, runListMutation]);

  // 处理清空操作
  const handleClean = useCallback(() => {
    const isFavoriteScope = scope === 'favorite';
    const cleanQuery = isFavoriteScope ? '?favorite=true' : '';

    openConfirmDialog({
      title: isFavoriteScope ? '确认清空收藏' : '确认清空当前内容',
      message: isFavoriteScope
        ? '确定要清空所有已收藏内容吗？此操作不可撤销。'
        : '确定要清空当前页面里的内容吗？已收藏的内容会保留。',
      confirmText: isFavoriteScope ? '清空收藏' : '清空内容',
      onConfirm: () => runListMutation({
        request: () => postWithAuth(`/api/clean${cleanQuery}`),
        successMessage: isFavoriteScope ? '收藏已清空' : '已清空当前内容，收藏内容已保留',
        errorPrefix: '清除失败',
      }),
      confirmColor: 'error'
    });
  }, [openConfirmDialog, postWithAuth, runListMutation, scope]);



  // 切换视图模式
  const handleToggleViewMode = useCallback(() => {
    setViewMode(prevMode => {
      const newMode = prevMode === 'list' ? 'gallery' : 'list';
      // Save to localStorage
      localStorage.setItem('arkdrop-view-mode', newMode);
      return newMode;
    });
  }, []);

  const isFavoriteScope = scope === 'favorite';
  const cleanLabel = isFavoriteScope ? '清空收藏' : '清空当前内容';
  const emptyStateTitle = isFavoriteScope ? '还没有收藏' : '还没有内容';
  const emptyStateDescription = isFavoriteScope
    ? '看到想保留的内容时点一下星标，就能在这里快速找到。'
    : '这里还没有内容，点右下角的加号就能添加。';
  const imagePreviewCol = isXs ? 1 : isSm ? 2 : isMd ? 3 : 4;

  useEffect(() => {
    setPageActions({
      hasPageActions: true,
      viewMode,
      cleanLabel,
      onToggleView: handleToggleViewMode,
      onClean: handleClean,
    });
  }, [cleanLabel, handleClean, handleToggleViewMode, setPageActions, viewMode]);

  useEffect(() => {
    return () => {
      resetPageActions();
    };
  }, [resetPageActions]);

  const galleryImages = useMemo(() => {
    const allImages = [];
    listData.forEach(item => {
      const images = item.attachments.filter(att => att.content_type.startsWith('image/'));
      images.forEach(img => {
        allImages.push({
          ...img,
          itemId: item.id,
          itemContent: item.content,
          itemCreatedAt: item.created_at,
        });
      });
    });
    return allImages;
  }, [listData]);

  return (
    <>
      <Box sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* AppBar占位空间 */}
        <Box sx={{ height: { xs: '54px', sm: '56px' }, flexShrink: 0 }} />

        {/* 可滚动的内容区域 */}
        <Box
          className="scrollable-container"
          sx={{
            flex: 1,
            overflow: 'auto',
            pt: { xs: 1.25, sm: 2 },
            pb: { xs: 10.5, sm: 8.5 }
          }}
        >
          <Container maxWidth="lg" sx={{ px: { xs: 1.25, sm: 2 } }}>
            {viewMode === 'list' ? (
              listData.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    py: { xs: 6, sm: 8 },
                    px: { xs: 2, sm: 3 },
                    mt: 1,
                    borderRadius: 3,
                    border: '1px dashed',
                    borderColor: 'divider',
                    backgroundColor: 'background.paper'
                  }}
                >
                  <Inbox sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h5" color="text.primary" gutterBottom>
                    {emptyStateTitle}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mb: 4 }}>
                    {emptyStateDescription}
                  </Typography>
                  {!isFavoriteScope && (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={openModal}
                        sx={{ borderRadius: 999, px: 2.5 }}
                      >
                        添加内容
                    </Button>
                  )}
                </Paper>
              ) : (
                <List
                  sx={{
                    width: '100%',
                    p: 0,
                    bgcolor: 'background.paper',
                    borderRadius: { xs: 1.5, sm: 2.5 },
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                  }}
                >
                  {listData.map((item, index) => (
                    <Fragment key={item.id}>
                      {index > 0 && (
                        <>
                          <Divider
                            variant="fullWidth"
                            component="li"
                            sx={{ display: { xs: 'block', sm: 'none' } }}
                          />
                          <Divider
                            variant="inset"
                            component="li"
                            sx={{ display: { xs: 'none', sm: 'block' } }}
                          />
                        </>
                      )}
                      <DataListItem
                        item={item}
                        expireSeconds={expireSeconds}
                        imagePreviewCol={imagePreviewCol}
                        onFavorite={handleFavorite}
                        onDelete={handleDelete}
                        onCopyMessage={showMessage}
                        onImagePreview={openImagePreview}
                      />
                    </Fragment>
                  ))}
                </List>
              )
            ) : (
              <ImageGalleryView
                images={galleryImages}
                onImagePreview={openImagePreview}
              />
            )}
          </Container>
        </Box>
      </Box>

      {/* Snackbar组件 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        message={snackbarMessage}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={closeSnackbar}
          >
            <Close fontSize="small" />
          </IconButton>
        }
      />

      {/* 添加Modal组件 */}
      <CreatePostModal
        open={modalOpen}
        handleClose={closeModal}
        onSubmitSuccess={listChangeAction}
        defaultFavorite={scope === 'favorite'}
      />

      {/* 确认对话框 */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText || '确定'}
        confirmColor={confirmDialog.confirmColor || 'primary'}
      />

      {/* 图片预览模态框 */}
      <ImagePreviewModal
        open={imagePreview.open}
        onClose={closeImagePreview}
        imageSrc={imagePreview.src}
        imageAlt={imagePreview.alt}
      />

      {/* 添加悬浮新增按钮 */}
      <Tooltip title="添加内容">
        <Fab
          color="primary"
          aria-label="添加内容"
          onClick={openModal}
          sx={{
            position: 'fixed',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
            right: { xs: 16, sm: 24 },
            zIndex: 1300,
          }}
        >
          <Add />
        </Fab>
      </Tooltip>
    </>
  );
};

export default HomePage;
