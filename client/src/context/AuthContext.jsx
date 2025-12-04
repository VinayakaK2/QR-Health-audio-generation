import { createContext, useContext, useState, useEffect } from 'react';
import axios from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load user data from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, [token]);

    const login = async (email, password) => {
        const response = await axios.post('/auth/login', { email, password });
        const { token: newToken, user: userData } = response.data;

        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));

        return response.data;
    };

    const setAuthData = (userData, newToken) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const value = {
        token,
        user,
        login,
        setAuthData,
        logout,
        isAuthenticated: !!token,
        isSuperAdmin: user?.role === 'SUPER_ADMIN',
        isHospitalAdmin: user?.role === 'HOSPITAL_ADMIN',
        hospitalId: user?.hospital,
        loading
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
};
