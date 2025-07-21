import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css'; // Import the CSS file

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
    <div className="login-container">
      <h2>请输入密码登录</h2>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>
            密码：
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        </div>
        {error && <p className="error-message">{error}</p>}
        <button
          type="submit"
          className="login-button"
        >
          登录
        </button>
      </form>
    </div>
  );
}