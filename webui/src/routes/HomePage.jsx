import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Container, Form, Button, Alert, Table, Card } from 'react-bootstrap';

const HomePage = () => {
  const wsRef = useRef(null);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [listData, setListData] = useState([]);

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
      setMessage('Please fill in content or select a file');
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

      setMessage('Submission successful: ' + JSON.stringify(response.data));

      listChangeAction();

      // Clear form
      setContent('');
      setFiles([]);
    } catch (error) {
      setMessage('Submission failed: ' + (error.response?.data?.message || error.message));
    }
  };

  // Clear all data
  const handleClean = async () => {
    if (window.confirm('Are you sure you want to clear all data?')) {
      try {
        await axios.post('/api/clean', {}, {
          withCredentials: true,
        });
        setMessage('Data cleared');

        listChangeAction();
      } catch (error) {
        setMessage('Clear failed: ' + error.message);
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

        setMessage('Data deleted');

        listChangeAction();
      } catch (error) {
        setMessage('Delete failed: ' + error.message);
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
      setMessage('Operation failed: ' + error.message);
    }
  };

  return (
    <Container>
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Control
            as="textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Control type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
        </Form.Group>
        <div className="d-flex justify-content-between align-items-center">
          <Button variant="primary" type="submit" className="me-2">发送</Button>
          <Button variant="danger" type="button" onClick={handleClean}>清空所有</Button>
        </div>
      </Form>

      {message && <Alert variant="info" className="mt-3">{message}</Alert>}

      <hr className="my-4" />

      {listData.length === 0 ? (
        <Alert variant="info">暂无数据</Alert>
      ) : (
        listData.map((item) => (
          <Card key={item.id} className="mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <Button
                  variant="outline-warning"
                  size="sm"
                  onClick={() => handleFavorite(item.id)}
                  className="me-2"
                >
                  {item.favorite ? '★' : '☆'}
                </Button>
                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(item.id)}>
                  删除
                </Button>
              </div>

              {item.content ? <Card.Text><pre>{item.content}</pre></Card.Text> : null}

              {item.attachments.filter(x => x.content_type.startsWith('image/')).map(file =>
                <div style={{ marginBottom: '10px' }} key={file.id}>
                  <Card.Img
                    src={`/files/${file.file_path}`}
                    alt={file.file_name}
                    style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain', display: 'block' }}
                  />
                </div>
              )}

              {item.attachments.length > 0 && (
                <>
                  <Card.Subtitle className="mb-2 text-muted">附件:</Card.Subtitle>
                  <ul className="list-unstyled">
                    {item.attachments.map((file) => (
                      <li key={file.id}>
                        <a
                          href={`/files/${file.file_path}`}
                          download={file.file_name}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {file.file_name}（{Math.round(file.file_size / 1024)} KB）
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <Card.Footer className="text-muted">
                创建时间: {new Date(item.created_at*1000).toLocaleString()}
              </Card.Footer>
            </Card.Body>
          </Card>
        ))
      )}
    </Container>
  );
};

export default HomePage;