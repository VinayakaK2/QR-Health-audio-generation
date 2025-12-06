import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import PatientReports from '../components/PatientReports';
import axios from '../api/axios';
import toast from 'react-hot-toast';

const PatientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPatient();
    }, [id]);

    const fetchPatient = async () => {
        try {
            const response = await axios.get(`/patients/${id}`);
            setPatient(response.data.patient);
        } catch (error) {
            toast.error('Failed to load patient');
            navigate('/patients');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadQR = () => {
        const link = document.createElement('a');
        link.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${patient.qrCodeUrl}`;
        link.download = `${patient.fullName.replace(/\s+/g, '_')}_QR.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('QR Code downloaded');
    };

    const getRiskBadgeClass = (riskLevel) => {
        const classes = {
            High: 'badge-high',
            Medium: 'badge-medium',
            Low: 'badge-low'
        };
        return classes[riskLevel] || 'badge-low';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!patient) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Details</h1>
                                <p className="text-gray-600">Complete patient information and QR code</p>
                            </div>
                            <div className="flex space-x-3">
                                <Link
                                    to={`/patients/edit/${patient._id}`}
                                    className="btn-secondary"
                                >
                                    Edit Patient
                                </Link>
                                <Link to="/patients" className="btn-outline">
                                    Back to List
                                </Link>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* QR Code Section */}
                            <div className="lg:col-span-1">
                                <div className="card text-center">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency QR Code</h2>
                                    {patient.qrCodeUrl && (
                                        <div className="mb-4">
                                            <img
                                                src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${patient.qrCodeUrl}`}
                                                alt="Patient QR Code"
                                                className="w-full max-w-xs mx-auto border-4 border-gray-200 rounded-lg"
                                            />
                                        </div>
                                    )}
                                    <button
                                        onClick={handleDownloadQR}
                                        className="btn-primary w-full"
                                    >
                                        <span className="flex items-center justify-center space-x-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            <span>Download QR</span>
                                        </span>
                                    </button>
                                    <a
                                        href={`/emergency/${patient.qrToken}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block mt-3 text-sm text-secondary hover:underline"
                                    >
                                        View Emergency Page →
                                    </a>
                                </div>
                            </div>

                            {/* Patient Information */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* AI Emergency Summary */}
                                <div className="card border-l-4 border-primary">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span>AI Emergency Summary</span>
                                    </h2>
                                    {patient.aiSummary ? (
                                        <div className="rounded-xl border p-4 bg-slate-50 text-sm leading-relaxed">
                                            <p className="whitespace-pre-line">{patient.aiSummary}</p>
                                            {patient.aiLastUpdatedAt && (
                                                <p className="mt-2 text-xs text-slate-500">
                                                    Last updated: {new Date(patient.aiLastUpdatedAt).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">
                                            Summary generating automatically...
                                        </p>
                                    )}
                                </div>

                                {/* Personal Info */}
                                <div className="card">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center justify-between">
                                        Personal Information
                                        <span className={getRiskBadgeClass(patient.riskLevel)}>
                                            {patient.riskLevel} Risk
                                        </span>
                                    </h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Full Name</p>
                                            <p className="text-lg font-semibold text-gray-900">{patient.fullName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Age</p>
                                            <p className="text-lg font-semibold text-gray-900">{patient.age} years</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Gender</p>
                                            <p className="text-lg font-semibold text-gray-900">{patient.gender}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Blood Group</p>
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                                                {patient.bloodGroup}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Medical Info */}
                                <div className="card">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Medical Information</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-2">Allergies</p>
                                            {patient.allergies.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {patient.allergies.map((allergy, index) => (
                                                        <span key={index} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-200">
                                                            {allergy}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 italic">None reported</p>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-600 mb-2">Medical Conditions</p>
                                            {patient.medicalConditions.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {patient.medicalConditions.map((condition, index) => (
                                                        <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                                                            {condition}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 italic">None reported</p>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-600 mb-2">Current Medications</p>
                                            {patient.medications.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {patient.medications.map((medication, index) => (
                                                        <span key={index} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
                                                            {medication}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 italic">None reported</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Emergency Contact */}
                                <div className="card">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Emergency Contact</h2>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-gray-900 text-lg">{patient.emergencyContact.name}</p>
                                            <p className="text-gray-600">{patient.emergencyContact.phone}</p>
                                        </div>
                                        <a
                                            href={`tel:${patient.emergencyContact.phone}`}
                                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium flex items-center space-x-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <span>Call</span>
                                        </a>
                                    </div>
                                </div>

                                {/* Medical Reports Section */}
                                <PatientReports patientId={patient._id} />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PatientDetail;
