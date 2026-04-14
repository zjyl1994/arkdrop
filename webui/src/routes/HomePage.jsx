import axios from 'axios';
import Fab from '@mui/material/Fab';

// 导入CreatePostModal组件
import CreatePostModal from '../compoments/CreatePostModal';
import ConfirmDialog from '../compoments/ConfirmDialog';
import ImagePreviewModal from '../compoments/ImagePreviewModal';
import DataListItem from '../compoments/DataListItem';
import ImageGalleryView from '../compoments/ImageGalleryView';
import { usePageActions } from '../contexts/PageActionsContext';

const HomePage = ({ scope = 'all' }) => {
  const { setPageActions, resetPageActions } = usePageActions();
  const wsRef = useRef(null);
  const cleanActionRef = useRef(null);
  const toggleViewActionRef = useRef(null);
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
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: '确定',
    onConfirm: null
  });
  const [imagePreview, setImagePreview] = useState({
    open: false,
    src: '',
    alt: ''
  });

  // 添加Modal控制函数
  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => setModalOpen(false);

  // Snackbar控制函数
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // 显示消息的函数，替代toast
  const showMessage = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  // 关闭确认对话框
  const handleCloseConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      title: '',
      message: '',
      confirmText: '确定',
      onConfirm: null
    });
  };

  // 处理图片预览
  const handleImagePreview = (src, alt) => {
    setImagePreview({
      open: true,
      src,
      alt
    });
  };

  // 关闭图片预览
  const handleCloseImagePreview = () => {
    setImagePreview({
      open: false,
      src: '',
      alt: ''
    });
  };

  const fetchData = async (nextScope = scopeRef.current) => {
    const query = nextScope === 'favorite' ? '?favorite=true' : '';

    try {
      const res = await axios.get(`/api/list${query}`, {
        withCredentials: true,
      });
      setListData(Array.isArray(res.data.list) ? res.data.list : []);
      setExpireSeconds(res.data.expire_seconds);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  // Fetch existing data on page load
  useEffect(() => {
    // WebSocket connection
    if (!wsRef.current) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsRef.current = new WebSocket(`${wsProtocol}//${window.location.host}/api/ws?echo=1`);

      wsRef.current.onopen = () => {
        console.log('WebSocket connection established');
      };

      wsRef.current.onmessage = (event) => {
        console.log('Received WebSocket message:', event.data);
        if (event.data === 'list_change') {
          fetchData(); // Refresh list
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed');
      };
    }

    // Close WebSocket connection on component unmount
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    scopeRef.current = scope;
    fetchData(scope);
  }, [scope]);

  // 定期更新TTL进度条
  useEffect(() => {
    const interval = setInterval(() => {
      // 强制重新渲染以更新TTL进度
      setListData(prevData => [...prevData]);
    }, 1000); // 每秒更新一次

    return () => clearInterval(interval);
  }, []);

  const listChangeAction = async (message, isError, shouldRefresh = !isError) => {
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
  };

  // 处理收藏操作
  const handleFavorite = async (id) => {
    try {
      await axios.post(`/api/favorite?id=${id}`, {}, {
        withCredentials: true,
      });
      listChangeAction();
    } catch (error) {
      showMessage('操作失败: ' + error.message);
    }
  };

  // 处理删除操作
  const handleDelete = async (id) => {
    setConfirmDialog({
      open: true,
      title: '确认删除',
      message: '确定要删除这条记录吗？',
      onConfirm: async () => {
        try {
          await axios.post(`/api/delete?id=${id}`, {}, {
            withCredentials: true,
          });
          showMessage('删除成功');
          listChangeAction();
        } catch (error) {
          showMessage('删除失败: ' + error.message);
        }
      }
    });
  };

  // 处理清空操作
  const handleClean = async () => {
    const isFavoriteScope = scope === 'favorite';
    const cleanQuery = isFavoriteScope ? '?favorite=true' : '';

    setConfirmDialog({
      open: true,
      title: isFavoriteScope ? '确认清空收藏' : '确认清空列表',
      message: isFavoriteScope
        ? '确定要清空所有已收藏内容吗？此操作不可撤销。'
        : '确定要清空当前列表中的普通内容吗？已收藏内容会保留。',
      confirmText: isFavoriteScope ? '清空收藏' : '清空列表',
      onConfirm: async () => {
        try {
          await axios.post(`/api/clean${cleanQuery}`, {}, {
            withCredentials: true,
          });
          showMessage(isFavoriteScope ? '收藏已清空' : '普通内容已清空，收藏已保留');
          listChangeAction();
        } catch (error) {
          showMessage('清除失败: ' + error.message);
        }
      },
      confirmColor: 'error'
    });
  };



  // 切换视图模式
  const handleToggleViewMode = () => {
    setViewMode(prevMode => {
      const newMode = prevMode === 'list' ? 'gallery' : 'list';
      // Save to localStorage
      localStorage.setItem('arkdrop-view-mode', newMode);
      return newMode;
    });
  };

  const isFavoriteScope = scope === 'favorite';
  const cleanLabel = isFavoriteScope ? '清空收藏' : '清空列表';
  const emptyStateTitle = isFavoriteScope ? '暂无收藏' : '暂无内容';
  const emptyStateDescription = isFavoriteScope
    ? '当前还没有收藏内容。先在列表里点亮星标，再回来集中查看。'
    : '当前还没有内容。点击右下角 FAB 即可快速添加。';

  cleanActionRef.current = handleClean;
  toggleViewActionRef.current = handleToggleViewMode;

  const handlePageClean = useCallback(() => {
    cleanActionRef.current?.();
  }, []);

  const handlePageToggleView = useCallback(() => {
    toggleViewActionRef.current?.();
  }, []);

  useEffect(() => {
    setPageActions({
      hasPageActions: true,
      viewMode,
      cleanLabel,
      onToggleView: handlePageToggleView,
      onClean: handlePageClean,
    });
  }, [cleanLabel, handlePageClean, handlePageToggleView, setPageActions, viewMode]);

  useEffect(() => {
    return () => {
      resetPageActions();
    };
  }, [resetPageActions]);

  // 获取所有图片附件
  const getAllImages = () => {
    const allImages = [];
    listData.forEach(item => {
      const images = item.attachments.filter(att => att.content_type.startsWith('image/'));
      images.forEach(img => {
        allImages.push({
          ...img,
          itemId: item.id,
          itemContent: item.content,
          itemCreatedAt: item.created_at
        });
      });
    });
    return allImages;
  };

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
                      onClick={handleOpenModal}
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
                        onFavorite={handleFavorite}
                        onDelete={handleDelete}
                        onImagePreview={handleImagePreview}
                      />
                    </Fragment>
                  ))}
                </List>
              )
            ) : (
              <ImageGalleryView
                images={getAllImages()}
                onImagePreview={handleImagePreview}
              />
            )}
          </Container>
        </Box>
      </Box>

      {/* Snackbar组件 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleSnackbarClose}
          >
            <Close fontSize="small" />
          </IconButton>
        }
      />

      {/* 添加Modal组件 */}
      <CreatePostModal
        open={modalOpen}
        handleClose={handleCloseModal}
        onSubmitSuccess={listChangeAction}
        defaultFavorite={scope === 'favorite'}
      />

      {/* 确认对话框 */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText || '确定'}
        confirmColor={confirmDialog.confirmColor || 'primary'}
      />

      {/* 图片预览模态框 */}
      <ImagePreviewModal
        open={imagePreview.open}
        onClose={handleCloseImagePreview}
        imageSrc={imagePreview.src}
        imageAlt={imagePreview.alt}
      />

      {/* 添加FAB浮动操作按钮 */}
      <Tooltip title="添加内容">
        <Fab
          color="primary"
          aria-label="添加内容"
          onClick={handleOpenModal}
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
