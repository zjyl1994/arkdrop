import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './routes/HomePage';
import LoginPage from './routes/LoginPage';
import PrivateRoute from './routes/PrivateRoute';
import { Container, Navbar } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';

function App() {
  return (
    <>
      <BrowserRouter>
        <Navbar bg="light" expand="lg" className="mb-4">
          <Container>
            <Navbar.Brand>ArkDrop</Navbar.Brand>
          </Container>
        </Navbar>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <HomePage />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </>
  );
}

export default App;