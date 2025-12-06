import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

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
            const response = await axios.get(`/public/patient/${token}`);
            setPatient(response.data.patient);
        } catch (error) {
            setError(true);
            toast.error('Invalid QR code or patient not found');
        } finally {
            setLoading(false);
        }
    };

    const getRiskBadge = (riskLevel) => {
        const badges = {
            High: {
                style: 'bg-red-500 text-white shadow-lg shadow-red-200',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                ),
                label: 'HIGH RISK'
            },
            Medium: {
                style: 'bg-amber-500 text-white shadow-lg shadow-amber-200',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                ),
                label: 'MEDIUM RISK'
            },
            Low: {
                style: 'bg-emerald-500 text-white shadow-lg shadow-emerald-200',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
                label: 'LOW RISK'
            }
        };

        const config = badges[riskLevel] || badges['Low'];

        return (
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm tracking-wide ${config.style}`}>
                {config.icon}
                <span>{config.label}</span>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
                    <p className="text-slate-600 text-lg font-medium">Accessing Emergency Records...</p>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="glass-card max-w-md w-full text-center p-8">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid QR Code</h1>
                    <p className="text-slate-500">Patient information not found. Please verify the QR code.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto space-y-6"
            >
                {/* Emergency Header */}
                <div className="glass-card overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-primary to-blue-500"></div>
                    <div className="p-6 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center space-x-5">
                                <div className="w-20 h-20 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex-shrink-0">
                                    {patient.photoUrl ? (
                                        <img src={patient.photoUrl} alt="Patient" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900">{patient.fullName}</h1>
                                    <div className="flex items-center space-x-3 text-slate-500 mt-1">
                                        <span>{patient.age} years</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>{patient.gender}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-shrink-0">
                                {getRiskBadge(patient.riskLevel)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Critical Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Blood Group */}
                    <div className="glass-card p-6 flex items-center justify-between bg-gradient-to-br from-red-50 to-white border-red-100">
                        <div>
                            <p className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-1">Blood Group</p>
                            <p className="text-4xl font-bold text-slate-900">{patient.bloodGroup}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                    </div>

                    {/* Emergency Contact - Quick Call */}
                    <a
                        href={`tel:${patient.emergencyContact.phone}`}
                        className="glass-card p-6 flex items-center justify-between bg-gradient-to-br from-emerald-50 to-white border-emerald-100 hover:shadow-md transition-all cursor-pointer group"
                    >
                        <div>
                            <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-1">Emergency Contact</p>
                            <p className="text-lg font-bold text-slate-900">{patient.emergencyContact.name}</p>
                            <p className="text-slate-500">{patient.emergencyContact.phone}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                    </a>
                </div>

                {/* AI Summary */}
                <div className="glass-card p-6 md:p-8">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">AI Emergency Summary</h2>
                    </div>

                    {patient.aiSummary ? (
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 text-slate-700 leading-relaxed">
                            {patient.aiSummary}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 italic">
                            Summary generating automatically...
                        </div>
                    )}
                </div>

                {/* Medical Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Allergies */}
                    <div className="glass-card p-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Allergies
                        </h3>
                        {patient.allergies && patient.allergies.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {patient.allergies.map((allergy, index) => (
                                    <span key={index} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">
                                        {allergy}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">No known allergies</p>
                        )}
                    </div>

                    {/* Medical Conditions */}
                    <div className="glass-card p-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Conditions
                        </h3>
                        {patient.medicalConditions && patient.medicalConditions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {patient.medicalConditions.map((condition, index) => (
                                    <span key={index} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100">
                                        {condition}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">No known conditions</p>
                        )}
                    </div>

                    {/* Medications */}
                    <div className="glass-card p-6 md:col-span-2">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Current Medications
                        </h3>
                        {patient.medications && patient.medications.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {patient.medications.map((medication, index) => (
                                    <span key={index} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100">
                                        {medication}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">No current medications</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center pt-8 pb-4">
                    <p className="text-slate-400 text-sm font-medium">Smart Emergency QR Health Identity System</p>
                    <p className="text-slate-400 text-xs mt-1">🚑 For emergency medical use only</p>
                </div>
            </motion.div>
        </div>
    );
};

export default EmergencyPage;
