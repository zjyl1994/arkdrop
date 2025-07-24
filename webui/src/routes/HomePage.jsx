import axios from 'axios';
import { GridView, ViewList } from '@mui/icons-material';

// 导入CreatePostModal组件
import CreatePostModal from '../compoments/CreatePostModal';
import ConfirmDialog from '../compoments/ConfirmDialog';
import ImagePreviewModal from '../compoments/ImagePreviewModal';
import DataListItem from '../compoments/DataListItem';
import ImageGalleryView from '../compoments/ImageGalleryView';

const HomePage = () => {
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
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
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

  // Fetch existing data on page load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/list', {
          withCredentials: true,
        });
        setListData(Array.isArray(res.data.list) ? res.data.list : []);
        setExpireSeconds(res.data.expire_seconds);
      } catch (error) {
        console.error('Failed to fetch data', error);
      }
    };

    fetchData();

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

  // 定期更新TTL进度条
  useEffect(() => {
    const interval = setInterval(() => {
      // 强制重新渲染以更新TTL进度
      setListData(prevData => [...prevData]);
    }, 1000); // 每秒更新一次

    return () => clearInterval(interval);
  }, []);

  const listChangeAction = async (message, isError) => {
    // Send message via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('list_change');
    } else {
      console.warn('WebSocket is not connected or closed, cannot send message.');
      const res = await axios.get('/api/list', {
        withCredentials: true,
      });
      setListData(Array.isArray(res.data.list) ? res.data.list : []);
      setExpireSeconds(res.data.expire_seconds);
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
    setConfirmDialog({
      open: true,
      title: '确认清除',
      message: '确定要清除所有数据吗？此操作不可撤销。',
      onConfirm: async () => {
        try {
          await axios.post('/api/clean', {}, {
            withCredentials: true,
          });
          showMessage('数据已清除');
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

  // SpeedDial操作
  const actions = [
    { icon: <Add />, name: '添加内容', onClick: handleOpenModal },
    { icon: <ClearAll />, name: '清空所有', onClick: handleClean },
    { 
      icon: viewMode === 'list' ? <GridView /> : <ViewList />, 
      name: viewMode === 'list' ? '图片预览' : '列表视图', 
      onClick: handleToggleViewMode 
    },
  ];

  return (
    <>
      <Box sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* AppBar占位空间 */}
        <Box sx={{ height: '64px', flexShrink: 0 }} />

        {/* 可滚动的内容区域 */}
        <Box
          className="scrollable-container"
          sx={{
            flex: 1,
            overflow: 'auto',
            px: 3,
            py: 2
          }}
        >
          {viewMode === 'list' ? (
            // 列表视图
            listData.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  py: 8,
                  px: 2,
                  mt: 4,
                  backgroundColor: 'transparent'
                }}
              >
                <Inbox sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" color="text.primary" gutterBottom>
                  暂无数据
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mb: 4 }}>
                  您还没有添加任何内容。点击右下角的加号按钮开始添加新内容。
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Add />}
                  onClick={handleOpenModal}
                >
                  添加内容
                </Button>
              </Paper>
            ) : (
              <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden' }}>
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
            // 图片网格视图
            <ImageGalleryView
              images={getAllImages()}
              onImagePreview={handleImagePreview}
            />
          )}
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
      />

      {/* 确认对话框 */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmColor={confirmDialog.confirmColor || 'primary'}
      />

      {/* 图片预览模态框 */}
      <ImagePreviewModal
        open={imagePreview.open}
        onClose={handleCloseImagePreview}
        imageSrc={imagePreview.src}
        imageAlt={imagePreview.alt}
      />

      {/* 添加SpeedDial浮动操作按钮 */}
      <SpeedDial
        ariaLabel="操作菜单"
        sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1300 }}
        icon={<SpeedDialIcon />}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.onClick}
          />
        ))}
      </SpeedDial>
    </>
  );
};

export default HomePage;