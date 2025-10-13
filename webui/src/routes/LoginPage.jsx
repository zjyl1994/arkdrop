import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Checkbox, FormControlLabel } from '@mui/material';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const form = new URLSearchParams();
      form.append('password', password);
      form.append('remember', remember ? '1' : '0');

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