import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PatientDashboard = () => {
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.id) {
            fetchPatientData();
        }
    }, [user]);

    const fetchPatientData = async () => {
        try {
            // We can reuse the existing GET /patients/:id endpoint
            // The auth middleware will verify the token, and the route checks access
            // But wait, GET /patients/:id checks if userRole is HOSPITAL_ADMIN.
            // We need to update that route to allow PATIENT role to access their own data.
            // Or we can create a new endpoint /patients/me.
            // Let's try /patients/me approach or update the existing one.
            // For now, let's assume we update GET /patients/:id to allow PATIENT role if ID matches.

            const response = await axios.get(`/patients/${user.id}`);
            setPatient(response.data.patient);
        } catch (error) {
            toast.error('Failed to load your data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!patient) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-primary">My Health Portal</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-700">Welcome, {patient.fullName}</span>
                            <button
                                onClick={logout}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* AI Summary Section */}
                {patient.aiSummary && (
                    <div className="mb-6 bg-white overflow-hidden shadow rounded-lg border-l-4 border-purple-500">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2 flex items-center">
                                <span className="text-2xl mr-2">🤖</span>
                                AI Health Summary
                            </h3>
                            <div className="prose max-w-none text-gray-700 whitespace-pre-line bg-purple-50 p-4 rounded-md">
                                {patient.aiSummary}
                            </div>
                            <p className="mt-2 text-xs text-gray-400">
                                Last updated: {new Date(patient.aiLastUpdatedAt).toLocaleString()}
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* QR Code Card */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6 text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Emergency QR</h3>
                            {patient.qrCodeUrl ? (
                                <div className="flex flex-col items-center">
                                    <img
                                        src={`${import.meta.env.VITE_API_URL}${patient.qrCodeUrl}`}
                                        alt="Emergency QR Code"
                                        className="w-48 h-48 object-contain mb-4 border-4 border-white shadow-lg"
                                    />
                                    <button
                                        onClick={async () => {
                                            try {
                                                const imageUrl = `${import.meta.env.VITE_API_URL}${patient.qrCodeUrl}`;
                                                const response = await fetch(imageUrl);
                                                const blob = await response.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.download = `QR-${patient.fullName.replace(/\s+/g, '-')}.png`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                window.URL.revokeObjectURL(url);
                                                toast.success('QR Code downloaded!');
                                            } catch (error) {
                                                console.error('Download failed:', error);
                                                toast.error('Failed to download QR Code');
                                            }
                                        }}
                                        className="btn-primary w-full justify-center"
                                    >
                                        Download QR Code
                                    </button>
                                </div>
                            ) : (
                                <p className="text-gray-500">QR Code not available</p>
                            )}
                        </div>
                    </div>

                    {/* Personal Info Card */}
                    <div className="bg-white overflow-hidden shadow rounded-lg md:col-span-2">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{patient.fullName}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Age / Gender</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{patient.age} / {patient.gender}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Blood Group</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{patient.bloodGroup}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{patient.email || 'N/A'}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    {/* Medical Info Card */}
                    <div className="bg-white overflow-hidden shadow rounded-lg md:col-span-3">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Details</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Allergies</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {patient.allergies?.length > 0 ? (
                                            <ul className="list-disc pl-4">
                                                {patient.allergies.map((item, i) => (
                                                    <li key={i}>{item}</li>
                                                ))}
                                            </ul>
                                        ) : 'None'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Medical Conditions</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {patient.medicalConditions?.length > 0 ? (
                                            <ul className="list-disc pl-4">
                                                {patient.medicalConditions.map((item, i) => (
                                                    <li key={i}>{item}</li>
                                                ))}
                                            </ul>
                                        ) : 'None'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Medications</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {patient.medications?.length > 0 ? (
                                            <ul className="list-disc pl-4">
                                                {patient.medications.map((item, i) => (
                                                    <li key={i}>{item}</li>
                                                ))}
                                            </ul>
                                        ) : 'None'}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PatientDashboard;
