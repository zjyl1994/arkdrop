import axios from 'axios';
import Cap from '@cap.js/widget';
import { useNavigate } from 'react-router-dom';
import { Checkbox, FormControlLabel } from '@mui/material';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [remember, setRemember] = useState(false);
  const [capToken, setCapToken] = useState('');
  const capRef = useRef(null);
  const navigate = useNavigate();

  const refreshCap = async () => {
    if (!capRef.current) {
      capRef.current = new Cap({ apiEndpoint: '/api/cap/' });
    }
    try {
      if (capRef.current.reset) capRef.current.reset();
    } catch (e) {
      console.warn('CAP reset error', e);
    }
    try {
      const res = await capRef.current.solve();
      const token = typeof res === 'string' ? res : res?.token;
      setCapToken(token || '');
      return token || '';
    } catch (e) {
      console.error('CAP solve error', e);
      setCapToken('');
      return '';
    }
  };

  useEffect(() => {
    capRef.current = new Cap({ apiEndpoint: '/api/cap/' });
    // 页面加载自动触发验证（隐藏模式）
    refreshCap();
    return () => {
      try {
        if (capRef.current?.reset) capRef.current.reset();
      } catch (e) {}
    };
  }, []);

  const handleLogin = async () => {
    try {
      const form = new URLSearchParams();
      form.append('password', password);
      form.append('remember', remember ? '1' : '0');
      let tokenToUse = capToken;
      if (!tokenToUse) {
        tokenToUse = await refreshCap();
      }
      form.append('cap_token', tokenToUse || '');

      const response = await axios.post('/api/login', form, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        withCredentials: true
      });

      const resp = response.data;

      if (resp) {
        navigate('/');
      }
    } catch (err) {
      setErrMsg('Login failed,check you password.');
      console.error(err);
      // 密码错误后重新计算CAPTCHA
      await refreshCap();
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 18 }}>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        padding={4}
        boxShadow={3}
        bgcolor="background.paper"
        borderRadius={2}
      >
        <Typography variant="h5" gutterBottom>
          ArkDrop
        </Typography>

        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />

        <Box width="100%" sx={{ mt: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
            }
            label="Remember Me"
          />
        </Box>

        {errMsg && (
          <Box width="100%">
            <Alert severity="error">
              {errMsg}
            </Alert>
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleLogin}
          sx={{ mt: 2 }}
        >
          LOGIN
        </Button>
      </Box>
    </Container>


  );
}