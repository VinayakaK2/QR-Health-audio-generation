import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import PatientForm from './pages/PatientForm';
import PatientDetail from './pages/PatientDetail';
import EmergencyPage from './pages/EmergencyPage';
import RegisterHospital from './pages/RegisterHospital';
import OwnerDashboard from './pages/OwnerDashboard';
import OwnerHospitalList from './pages/OwnerHospitalList';
import OwnerHospitalPatients from './pages/OwnerHospitalPatients';
import OwnerReports from './pages/OwnerReports';
import AdminRequests from './pages/AdminRequests';

import PatientDashboard from './pages/PatientDashboard';

function App() {
    return (
        <AuthProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#fff',
                            color: '#363636',
                        },
                        success: {
                            duration: 3000,
                            iconTheme: {
                                primary: '#4CAF50',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            duration: 4000,
                            iconTheme: {
                                primary: '#E53935',
                                secondary: '#fff',
                            },
                        },
                    }}
                />

                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register-hospital" element={<RegisterHospital />} />
                    <Route path="/emergency/:token" element={<EmergencyPage />} />

                    {/* Owner Portal (SUPER_ADMIN only) */}
                    <Route
                        path="/owner/dashboard"
                        element={
                            <ProtectedRoute>
                                <OwnerDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/owner/hospitals"
                        element={
                            <ProtectedRoute>
                                <OwnerHospitalList />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/owner/hospitals/:id/patients"
                        element={
                            <ProtectedRoute>
                                <OwnerHospitalPatients />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/owner/reports"
                        element={
                            <ProtectedRoute>
                                <OwnerReports />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/requests"
                        element={
                            <ProtectedRoute>
                                <AdminRequests />
                            </ProtectedRoute>
                        }
                    />

                    {/* Patient Portal Routes */}

                    <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={['PATIENT']}><PatientDashboard /></ProtectedRoute>} />

                    {/* Hospital Admin Protected Routes */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/patients"
                        element={
                            <ProtectedRoute>
                                <PatientList />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/patients/new"
                        element={
                            <ProtectedRoute>
                                <PatientForm />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/patients/edit/:id"
                        element={
                            <ProtectedRoute>
                                <PatientForm />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/patients/:id"
                        element={
                            <ProtectedRoute>
                                <PatientDetail />
                            </ProtectedRoute>
                        }
                    />

                    {/* Default Redirect */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
