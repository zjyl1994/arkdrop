import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './HomePage.css'; // Import the CSS file

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
      if (wsRef.current) {
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
    <div className="container">
      <h2 className="section-title">创建内容</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            内容：
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            选择文件：
            <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
          </label>
        </div>

        <div className="button-group">
          <button type="submit">发送</button>
          <button type="button" onClick={handleClean} className="clean-button">清空所有</button>
        </div>
      </form>

      {message && <p className="message">{message}</p>}

      <hr className="divider" />

      <h2 className="section-title">已有内容列表</h2>
      {listData.length === 0 ? (
        <p className="no-data-message">暂无数据</p>
      ) : (
        listData.map((item) => (
          <div key={item.id} className="list-item">
            <div className="list-item-header">
              <button
                type="button"
                onClick={() => handleFavorite(item.id)}
                className="favorite-button"
              >
                {item.favorite ? '★' : '☆'}
              </button>
              <button type="button" onClick={() => handleDelete(item.id)} className="delete-button">
                删除
              </button>
            </div>

            {item.content ? <p><strong>内容:</strong> {item.content}</p> : null}

            {item.attachments.filter(x => x.content_type.startsWith('image/')).map(file =>
              <div style={{ marginBottom: '10px' }} key={file.id}>
                <img
                  src={`/files/${file.file_path}`}
                  alt={file.file_name}
                  style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            )}

            {item.attachments.length > 0 && (
              <>
                <strong>附件:</strong>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
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
          </div>
        ))
      )}
    </div>
  );
};

export default HomePage;