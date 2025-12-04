import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import FaceCapture from '../components/FaceCapture';
import axios from '../api/axios';

const Login = () => {
    const [loginType, setLoginType] = useState('admin'); // 'admin' | 'patient'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showFaceAuth, setShowFaceAuth] = useState(false);

    const { login, setAuthData } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e, descriptor = null) => {
        if (e) e.preventDefault();

        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        setLoading(true);

        try {
            if (loginType === 'admin') {
                // Admin/Hospital Login
                const response = await login(email, password);
                toast.success('Login successful!');

                if (response.user.role === 'SUPER_ADMIN') {
                    navigate('/owner/hospitals');
                } else {
                    navigate('/dashboard');
                }
            } else {
                // Patient Login
                const payload = {
                    email,
                    password
                };

                // Use the new dedicated patient login endpoint
                const response = await axios.post('/auth/patient-login', payload);

                if (response.data.token) {
                    // Adapt response to match what useAuth expects (user object)
                    const userData = {
                        id: response.data.patientId,
                        name: response.data.name,
                        email: response.data.email,
                        role: response.data.role
                    };

                    setAuthData(userData, response.data.token);
                    toast.success('Welcome back!');
                    navigate('/patient/dashboard');
                }
            }
        } catch (error) {
            if (loginType === 'patient' && error.response?.data?.requireFaceAuth) {
                setShowFaceAuth(true);
                toast('Please scan your face to verify identity', {
                    icon: '👤',
                });
            } else {
                toast.error(error.response?.data?.message || 'Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFaceCapture = (descriptor) => {
        handleSubmit(null, descriptor);
    };

    const fillAdminCredentials = () => {
        setLoginType('admin');
        setEmail('owner@emergency.com');
        setPassword('owner123');
    };

    const fillHospitalCredentials = () => {
        setLoginType('admin');
        setEmail('admin@hospital.com');
        setPassword('admin@123');
    };

    const fillPatientCredentials = () => {
        setLoginType('patient');
        setEmail('john.doe.76@example.com');
        setPassword('password123');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-secondary/10 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-4 shadow-lg">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Smart Emergency QR</h1>
                    <p className="text-gray-600 mt-2">Multi-Hospital Health Identity System</p>
                </div>

                <div className="card">
                    {/* Login Type Tabs */}
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${loginType === 'admin'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => {
                                setLoginType('admin');
                                setShowFaceAuth(false);
                            }}
                        >
                            Hospital / Admin
                        </button>
                        <button
                            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${loginType === 'patient'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => {
                                setLoginType('patient');
                                setShowFaceAuth(false);
                            }}
                        >
                            Patient Portal
                        </button>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        {loginType === 'admin' ? 'Staff Sign In' : 'Patient Sign In'}
                    </h2>

                    {!showFaceAuth ? (
                        <form onSubmit={(e) => handleSubmit(e)} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field"
                                    placeholder="Enter your email"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field"
                                    placeholder="Enter your password"
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing in...
                                    </span>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Face Verification Required</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    For your security, please verify your identity by scanning your face.
                                </p>

                                <FaceCapture
                                    onCapture={handleFaceCapture}
                                    label="Scan Face to Login"
                                />

                                <button
                                    onClick={() => setShowFaceAuth(false)}
                                    className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
                                >
                                    Cancel and go back
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 space-y-3">
                        <div className="text-center">
                            <p className="text-sm text-gray-600 mb-2">
                                Don't have an account?{' '}
                                <Link to="/register-hospital" className="text-primary hover:text-primary-dark font-medium">
                                    Register your hospital
                                </Link>
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={fillAdminCredentials}
                                className="px-2 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                            >
                                Admin
                            </button>
                            <button
                                type="button"
                                onClick={fillHospitalCredentials}
                                className="px-2 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                            >
                                Hospital
                            </button>
                            <button
                                type="button"
                                onClick={fillPatientCredentials}
                                className="px-2 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                            >
                                Patient
                            </button>
                        </div>
                    </div>
                </div>

                <p className="text-center text-gray-600 text-sm mt-6">
                    Emergency medical identity system for healthcare institutions
                </p>
            </div>
        </div>
    );
};

export default Login;
