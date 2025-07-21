import React, { useState, useEffect } from 'react';
import axios from 'axios';

const HomePage = () => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [listData, setListData] = useState([]);

  // 页面加载时获取已有数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/list', {
          withCredentials: true,
        });
        setListData(res.data);
      } catch (error) {
        console.error('获取数据失败', error);
      }
    };

    fetchData();
  }, []);

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content && files.length === 0) {
      setMessage('请填写内容或选择文件');
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

      setMessage('提交成功: ' + JSON.stringify(response.data));

      // 刷新列表
      const res = await axios.get('/api/list', {
        withCredentials: true,
      });
      setListData(res.data);

      // 清空表单
      setContent('');
      setFiles([]);
    } catch (error) {
      setMessage('提交失败: ' + (error.response?.data?.message || error.message));
    }
  };

  // 清空所有数据
  const handleClean = async () => {
    if (window.confirm('确定要清空所有数据吗？')) {
      try {
        await axios.post('/api/clean', {}, {
          withCredentials: true,
        });
        setListData([]);
        setMessage('数据已清空');
      } catch (error) {
        setMessage('清空失败: ' + error.message);
      }
    }
  };

  // 删除单条数据
  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这条数据吗？')) {
      try {
        await axios.post(`/api/delete?id=${id}`, {}, {
          withCredentials: true,
        });

        setListData(listData.filter(item => item.id !== id));
        setMessage('数据已删除');
      } catch (error) {
        setMessage('删除失败: ' + error.message);
      }
    }
  };

  // 加星操作
  const handleFavorite = async (id) => {
    try {
      await axios.post(`/api/favorite?id=${id}`, {}, {
        withCredentials: true,
      });

      setListData(
        listData.map(item =>
          item.id === id ? { ...item, favorite: !item.favorite } : item
        )
      );
    } catch (error) {
      setMessage('操作失败: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>创建内容</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            内容：
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ width: '100%', height: '100px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            选择文件：
            <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
          </label>
        </div>

        <button type="submit">发送</button>
        <button type="button" onClick={handleClean} style={{ marginLeft: '10px', color: 'red' }}>清空所有</button>
      </form>

      {message && <p style={{ marginTop: '20px', color: 'blue' }}>{message}</p>}

      <hr style={{ margin: '40px 0' }} />

      <h2>已有内容列表</h2>
      {listData.length === 0 ? (
        <p>暂无数据</p>
      ) : (
        listData.map((item) => (
          <div key={item.id} style={{
            marginBottom: '30px',
            border: '1px solid #ccc',
            padding: '15px',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleFavorite(item.id)}
                style={{ marginRight: '10px' }}
              >
                {item.favorite ? '★' : '☆'}
              </button>
              <button type="button" onClick={() => handleDelete(item.id)} style={{ color: 'red' }}>
                删除
              </button>
            </div>

            {item.content ? <p><strong>内容:</strong> {item.content}</p> : null}

            {item.attachments.filter(x => x.content_type.startsWith('image/')).map(file =>
              <div style={{ marginBottom: '10px' }}>
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