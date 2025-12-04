import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const EmergencyPage = () => {
    const { token } = useParams();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetchPatientData();
    }, [token]);

    const fetchPatientData = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/public/patient/${token}`);
            setPatient(response.data.patient);
        } catch (error) {
            setError(true);
            toast.error('Invalid QR code or patient not found');
        } finally {
            setLoading(false);
        }
    };

    const getRiskBadge = (riskLevel) => {
        if (riskLevel === 'High') {
            return (
                <div className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg border-2 border-red-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-bold text-lg">HIGH RISK</span>
                </div>
            );
        } else if (riskLevel === 'Medium') {
            return (
                <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg border-2 border-yellow-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-bold text-lg">MEDIUM RISK</span>
                </div>
            );
        } else {
            return (
                <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg border-2 border-green-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-bold text-lg">LOW RISK</span>
                </div>
            );
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading patient information...</p>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid QR Code</h1>
                    <p className="text-gray-600">Patient information not found. Please verify the QR code.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 p-4 py-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-t-2xl shadow-lg p-6 border-b-4 border-primary">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900">{patient.fullName}</h1>
                            <p className="text-gray-600">{patient.age} years • {patient.gender}</p>
                        </div>
                        {getRiskBadge(patient.riskLevel)}
                    </div>
                </div>

                {/* Blood Group - Prominent Display */}
                <div className="bg-gradient-to-r from-red-600 to-red-500 text-white p-8 text-center shadow-lg">
                    <p className="text-sm font-semibold uppercase tracking-wider mb-2">Blood Group</p>
                    <p className="text-6xl font-bold">{patient.bloodGroup}</p>
                </div>

                {/* Allergies - Critical Info */}
                {patient.allergies && patient.allergies.length > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-600 p-6 shadow-md">
                        <div className="flex items-start space-x-3">
                            <svg className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-red-900 mb-3">⚠️ ALLERGIES</h2>
                                <div className="flex flex-wrap gap-2">
                                    {patient.allergies.map((allergy, index) => (
                                        <span key={index} className="px-4 py-2 bg-red-100 text-red-900 rounded-lg text-lg font-semibold border-2 border-red-300">
                                            {allergy}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Emergency Summary */}
                <section className="bg-white shadow-lg p-6 mb-4 border-l-4 border-primary">
                    <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center space-x-2">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>AI Emergency Summary</span>
                    </h2>
                    {patient.aiSummary ? (
                        <div className="rounded-lg border p-4 bg-slate-50 text-base leading-relaxed text-gray-800">
                            <p className="whitespace-pre-line">{patient.aiSummary}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 italic">
                            Summary generating automatically...
                        </p>
                    )}
                </section>

                {/* Medical Information */}
                <div className="bg-white shadow-lg p-6">
                    <div className="space-y-6">
                        {/* Medical Conditions */}
                        {patient.medicalConditions && patient.medicalConditions.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center space-x-2">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>Medical Conditions</span>
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {patient.medicalConditions.map((condition, index) => (
                                        <span key={index} className="px-3 py-2 bg-blue-50 text-blue-900 rounded-lg font-medium border border-blue-200">
                                            {condition}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Medications */}
                        {patient.medications && patient.medications.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center space-x-2">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <span>Current Medications</span>
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {patient.medications.map((medication, index) => (
                                        <span key={index} className="px-3 py-2 bg-green-50 text-green-900 rounded-lg font-medium border border-green-200">
                                            {medication}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-white rounded-b-2xl shadow-lg p-6 border-t-2 border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Emergency Contact</h3>
                    <div className="bg-gradient-to-r from-primary to-primary-dark rounded-xl p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90 mb-1">Contact Person</p>
                                <p className="text-2xl font-bold">{patient.emergencyContact.name}</p>
                                <p className="text-lg mt-2">{patient.emergencyContact.phone}</p>
                            </div>
                            <a
                                href={`tel:${patient.emergencyContact.phone}`}
                                className="w-16 h-16 bg-white text-primary rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </a>
                        </div>
                        <a
                            href={`tel:${patient.emergencyContact.phone}`}
                            className="mt-4 block w-full bg-white text-primary text-center py-3 px-6 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors"
                        >
                            📞 CALL EMERGENCY CONTACT
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-gray-600 text-sm">
                    <p>Smart Emergency QR Health Identity System</p>
                    <p className="mt-1">🚑 For emergency medical use only</p>
                </div>
            </div>
        </div>
    );
};

export default EmergencyPage;
