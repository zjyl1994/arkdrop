import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import ImageListItem from '@mui/material/ImageListItem';
import ImageList from '@mui/material/ImageList';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Download from '@mui/icons-material/Download';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InboxIcon from '@mui/icons-material/Inbox';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import Paper from '@mui/material/Paper';

// 导入CreatePostModal组件
import CreatePostModal from '../compoments/CreatePostModal';

const HomePage = () => {
  const wsRef = useRef(null);
  const [listData, setListData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
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

  // Fetch existing data on page load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/list', {
          withCredentials: true,
        });
        setListData(res.data);
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

  const listChangeAction = async (message, isError) => {
    // Send message via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('list_change');
    } else {
      console.warn('WebSocket is not connected or closed, cannot send message.');
      const res = await axios.get('/api/list', {
        withCredentials: true,
      });
      setListData(res.data);
    }
    
    // 如果有消息，则显示
    if (message) {
      showMessage(message);
    }
  }
  // 处理收藏操作
  const handleFavorite = async (id) => {
    try {
      await axios.post(`/api/favorite/${id}`, {}, {
        withCredentials: true,
      });
      listChangeAction();
    } catch (error) {
      showMessage('操作失败: ' + error.message);
    }
  };

  // 处理删除操作
  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      try {
        await axios.post(`/api/delete/${id}`, {}, {
          withCredentials: true,
        });
        showMessage('删除成功');
        listChangeAction();
      } catch (error) {
        showMessage('删除失败: ' + error.message);
      }
    }
  };

  // Clear all data
  const handleClean = async () => {
    if (window.confirm('确定要清除所有数据吗？')) {
      try {
        await axios.post('/api/clean', {}, {
          withCredentials: true,
        });
        showMessage('数据已清除');
        listChangeAction();
      } catch (error) {
        showMessage('清除失败: ' + error.message);
      }
    }
  };

  // SpeedDial操作
  const actions = [
    { icon: <AddIcon />, name: '添加内容', onClick: handleOpenModal },
    { icon: <DeleteIcon />, name: '清空所有', onClick: handleClean },
  ];

  return (
    <Container>
      {/* Snackbar组件 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleSnackbarClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
      
      {/* 添加SpeedDial浮动操作按钮 */}
      <SpeedDial
        ariaLabel="操作菜单"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
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
      
      {/* 添加Modal组件 */}
      <CreatePostModal 
        open={modalOpen} 
        handleClose={handleCloseModal} 
        onSubmitSuccess={listChangeAction}
      />

      {listData.length === 0 ? (
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
          <InboxIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" color="text.primary" gutterBottom>
            暂无数据
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mb: 4 }}>
            您还没有添加任何内容。点击右下角的加号按钮开始添加新内容。
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenModal}
          >
            添加内容
          </Button>
        </Paper>
      ) : (
        listData.map((item) => {
          const imageList = item.attachments.filter(x => x.content_type.startsWith('image/'));
          return (
            <Card key={item.id} sx={{ mb: 2 }}>
              <CardContent>
                <Typography>
                  {dayjs.unix(item.created_at).format('YYYY-MM-DD HH:mm:ss')}
                </Typography>
                <ButtonGroup variant="contained">
                  <Button
                    onClick={() => handleFavorite(item.id)}
                  >
                    {item.favorite ? 'Starred' : 'Star'}
                  </Button>
                  <Button onClick={() => handleDelete(item.id)}>
                    Trash
                  </Button>
                </ButtonGroup>

                {item.content ? <pre>{item.content}</pre> : null}

                {imageList.length > 0 &&
                  <ImageList cols={3} rowHeight={164} variant="masonry" >
                    {imageList.map(file =>
                      <ImageListItem key={file.id}>
                        <img
                          key={file.id}
                          src={`/files/${file.file_path}`}
                          alt={file.file_name}
                          loading="lazy"
                        />
                      </ImageListItem>
                    )}
                  </ImageList>
                }
                {item.attachments.length > 0 && (
                  <List>
                    {item.attachments.map((file) => (
                      <ListItem key={file.id}>
                        <ListItemButton>
                          <ListItemText primary={`${file.file_name}（${Math.round(file.file_size / 1024)} KB）`} />
                          <ListItemIcon>
                            <a
                              href={`/files/${file.file_path}`}
                              download={file.file_name}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download />
                            </a>
                          </ListItemIcon>
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </Container>
  );
};

export default HomePage;