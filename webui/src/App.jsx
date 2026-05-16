import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './routes/HomePage';
import LoginPage from './routes/LoginPage';
import PrivateRoute from './routes/PrivateRoute';
import AppNavBar from './compoments/AppNavBar';
import { PageActionsProvider } from './contexts/PageActionsContext';
import './assets/scrollbar.css';

const themeColor = indigo[500];

const theme = createTheme({
  palette: {
    primary: {
      main: themeColor,
    },
    secondary: {
      main: blue[500],
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          height: '100%',
          backgroundColor: themeColor,
        },
        body: {
          minHeight: '100%',
          backgroundColor: themeColor,
        },
        '#root': {
          minHeight: '100%',
          backgroundColor: '#fff',
        },
      },
    },
  },
  typography: {
    fontFamily: 'Lato, Arial, sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PageActionsProvider>
        <BrowserRouter>
          <AppNavBar />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <HomePage scope="all" />
                </PrivateRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <PrivateRoute>
                  <HomePage scope="favorite" />
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </PageActionsProvider>
    </ThemeProvider>
  );
}

export default App;
