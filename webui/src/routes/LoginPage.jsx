import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert  from '@mui/material/Alert';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [errMsg, setErrMsg] = useState('');
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
      setErrMsg('登录失败，请检查密码是否正确');
      console.error(err);
    }
  };

  return (
    <Box
      component="form"
      sx={{ '& > :not(style)': { m: 1, width: '25ch' } }}
      noValidate
      autoComplete="off"
      onSubmit={handleLogin}
    >
      {errMsg && <Alert variant="filled" severity="error">{errMsg}</Alert>}
      <TextField
        variant="filled"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button>LOGIN</Button>
    </Box>
  );
}