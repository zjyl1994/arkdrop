import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import Container from '@mui/material/Container';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
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

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const HomePage = () => {
  const wsRef = useRef(null);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [listData, setListData] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(Date.now());

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
      wsRef.current = new WebSocket(`${wsProtocol}//${window.location.host}/api/ws`);

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

  const listChangeAction = async () => {
    // Send message via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('list_change');
    } else {
      console.warn('WebSocket is not connected or closed, cannot send message.');
    }
    const res = await axios.get('/api/list', {
      withCredentials: true,
    });
    setListData(res.data);
  }
  // Handle form submission
  const handleSubmit = async (e) => {
    if (!content && files.length === 0) {
      toast('Please fill in content or select a file');
      return;
    }

    const formData = new FormData();
    if (content) formData.append('content', content);
    files.forEach((file) => formData.append('files', file));

    try {
      const response = await axios.post('/api/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });

      toast('Submission successful: ' + JSON.stringify(response.data));

      listChangeAction();

      // Clear form
      setContent('');
      setFiles([]);
      setFileInputKey(Date.now());
    } catch (error) {
      toast('Submission failed: ' + (error.response?.data?.message || error.message));
    }
  };

  // Clear all data
  const handleClean = async () => {
    if (window.confirm('Are you sure you want to clear all data?')) {
      try {
        await axios.post('/api/clean', {}, {
          withCredentials: true,
        });
        toast('Data cleared');

        listChangeAction();
      } catch (error) {
        toast('Clear failed: ' + error.message);
      }
    }
  };

  // Delete single data item
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.post(`/api/delete?id=${id}`, {}, {
          withCredentials: true,
        });

        toast('Data deleted');

        listChangeAction();
      } catch (error) {
        toast('Delete failed: ' + error.message);
      }
    }
  };

  // Favorite action
  const handleFavorite = async (id) => {
    try {
      await axios.post(`/api/favorite?id=${id}`, {}, {
        withCredentials: true,
      });

      listChangeAction();
    } catch (error) {
      toast('Operation failed: ' + error.message);
    }
  };

  return (
    <Container>
      <Box width="100%">
        <TextareaAutosize
          value={content}
          onChange={(e) => setContent(e.target.value)}
          width="100%"
        />
        <ButtonGroup variant="contained">
          <Button
            component="label"
            role={undefined}
            variant="contained"
            tabIndex={-1}
            startIcon={<CloudUploadIcon />}
          >
            {files.length > 0 ? `${files.length} Selected` : "Upload files"}
            <VisuallyHiddenInput
              type="file"
              onChange={(e) => setFiles(Array.from(e.target.files))}
              key={fileInputKey}
              multiple
            />
          </Button>
          <Button onClick={handleSubmit}>Send</Button>
          <Button onClick={handleClean}>Clean</Button>
        </ButtonGroup>
      </Box>

      {listData.length === 0 ? (
        <Alert severity="info">暂无数据</Alert>
      ) : (
        listData.map((item) => {
          const imageList = item.attachments.filter(x => x.content_type.startsWith('image/'));
          return (
            <Card key={item.id}>
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
                      <ImageListItem key={item.img}>
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