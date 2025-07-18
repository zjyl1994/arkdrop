import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';

export default function PrivateRoute({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = Cookies.get('droptoken');
        setIsAuthenticated(!!token);
    }, []);

    useEffect(() => {
        if (isAuthenticated === false) {
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    if (isAuthenticated === null) {
        return <div>加载中...</div>;
    }

    return isAuthenticated ? children : null;
}