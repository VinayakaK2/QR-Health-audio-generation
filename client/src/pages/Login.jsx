import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import FaceCapture from '../components/FaceCapture';
import axios from '../api/axios';
import { motion } from 'framer-motion';

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
                    password,
                    faceDescriptor: descriptor // Include face descriptor if available
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
        setEmail('owner@smartqr.com');
        setPassword('owner123');
    };

    const fillHospitalCredentials = () => {
        setLoginType('admin');
        setEmail('admin1@hospital.com');
        setPassword('password123');
    };

    const fillPatientCredentials = () => {
        setLoginType('patient');
        setEmail('john.doe.414@example.com');
        setPassword('password123');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-3xl -z-10"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/20 blur-3xl -z-10"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl mb-6 shadow-lg shadow-primary/25 hover:scale-105 transition-transform">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
                    <p className="text-slate-500 mt-2">Sign in to access your dashboard</p>
                </div>

                <div className="glass-card p-8">
                    {/* Login Type Tabs */}
                    <div className="flex p-1 bg-slate-100/50 rounded-xl mb-8">
                        <button
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${loginType === 'admin'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                            onClick={() => {
                                setLoginType('admin');
                                setShowFaceAuth(false);
                            }}
                        >
                            Hospital Staff
                        </button>
                        <button
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${loginType === 'patient'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                            onClick={() => {
                                setLoginType('patient');
                                setShowFaceAuth(false);
                            }}
                        >
                            Patient Portal
                        </button>
                    </div>

                    {!showFaceAuth ? (
                        <form onSubmit={(e) => handleSubmit(e)} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field"
                                    placeholder="name@example.com"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                        Password
                                    </label>
                                    <Link to="#" className="text-sm text-primary hover:text-primary-dark font-medium">
                                        Forgot password?
                                    </Link>
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field"
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary disabled:opacity-70 disabled:cursor-not-allowed mt-2"
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
                        <div className="space-y-6 text-center">
                            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                                    👤
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Face Verification</h3>
                                <p className="text-sm text-slate-500 mb-6">
                                    Please look at the camera to verify your identity.
                                </p>

                                <FaceCapture
                                    onCapture={handleFaceCapture}
                                    label="Scan Face"
                                />

                                <button
                                    onClick={() => setShowFaceAuth(false)}
                                    className="mt-6 text-sm text-slate-500 hover:text-slate-700 font-medium"
                                >
                                    Cancel verification
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <p className="text-center text-sm text-slate-500 mb-4">
                            Don't have an account?{' '}
                            <Link to="/register-hospital" className="text-primary hover:text-primary-dark font-semibold">
                                Register Hospital
                            </Link>
                        </p>

                        {/* Quick Login for Demo */}
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={fillAdminCredentials} className="text-xs px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded border border-slate-200 transition-colors">
                                Demo Admin
                            </button>
                            <button onClick={fillHospitalCredentials} className="text-xs px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded border border-slate-200 transition-colors">
                                Demo Hospital
                            </button>
                            <button onClick={fillPatientCredentials} className="text-xs px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded border border-slate-200 transition-colors">
                                Demo Patient
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
