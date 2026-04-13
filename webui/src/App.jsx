import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './routes/HomePage';
import LoginPage from './routes/LoginPage';
import PrivateRoute from './routes/PrivateRoute';
import AppNavBar from './compoments/AppNavBar';
import { PageActionsProvider } from './contexts/PageActionsContext';
import './assets/scrollbar.css';

const theme = createTheme({
  palette: {
    primary: {
      main: indigo[500],
    },
    secondary: {
      main: blue[500],
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
