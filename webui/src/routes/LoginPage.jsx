import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('/api/login', {
        password: password
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const resp = response.data;

      if (resp) {
        navigate('/');
      }
    } catch (err) {
      setError('登录失败，请检查密码是否正确');
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: 300, margin: '50px auto' }}>
      <h2>请输入密码登录</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>
            密码：
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', margin: '10px 0' }}
            />
          </label>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button
          type="submit"
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          登录
        </button>
      </form>
    </div>
  );
}