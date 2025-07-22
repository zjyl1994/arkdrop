import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Container, Form, Button, Alert, ListGroup, Card, Image } from 'react-bootstrap';
import { Trash, Star } from 'react-bootstrap-icons';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';

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
    e.preventDefault();

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

  const handleLogout = async () => {
    Cookies.remove('droptoken');
    window.location.reload();
  }

  return (
    <Container>
      <div className="mb-3">
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Control
              as="textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Control
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files))}
              key={fileInputKey}
            />
          </Form.Group>
          <div className="d-flex justify-content-between align-items-center">
            <Button variant="primary" type="submit" className="me-2">发送</Button>
            <Button variant="danger" type="button" onClick={handleClean}>清空所有</Button>
          </div>
        </Form>
      </div>

      {listData.length === 0 ? (
        <Alert variant="info">暂无数据</Alert>
      ) : (
        listData.map((item) => (
          <Card key={item.id} className="mb-3">
            <Card.Body>
              <Card.Title className="d-flex justify-content-between align-items-center">
                <div>
                  {dayjs.unix(item.created_at).format('YYYY-MM-DD HH:mm:ss')}
                </div>
                <div>
                  <Button
                    variant={item.favorite ? 'warning' : 'outline-warning'}
                    size="sm"
                    onClick={() => handleFavorite(item.id)}
                    className="me-2"
                  >
                    <Star />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                    <Trash />
                  </Button>
                </div>
              </Card.Title>

              {item.content ? <pre>{item.content}</pre> : null}

              {item.attachments.filter(x => x.content_type.startsWith('image/')).map(file =>
                <Image
                  key={file.id}
                  src={`/files/${file.file_path}`}
                  alt={file.file_name}
                  className="my-2"
                  rounded fluid />
              )}
            </Card.Body>
            {item.attachments.length > 0 && (
              <ListGroup className="list-group-flush">
                {item.attachments.map((file) => (
                  <ListGroup.Item key={file.id}> <a
                    href={`/files/${file.file_path}`}
                    download={file.file_name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {file.file_name}（{Math.round(file.file_size / 1024)} KB）
                  </a></ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        ))
      )}
      <div className="d-grid gap-2 mb-3">
        <Button onClick={handleLogout} variant="outline-danger" type="button" size="lg">退出登录</Button>
      </div>
    </Container>
  );
};

export default HomePage;