import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

import * as htmlToImage from 'html-to-image';

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
            const response = await axios.get(`/patients/${user.id}`);
            setPatient(response.data.patient);
        } catch (error) {
            toast.error('Failed to load your data');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadCard = async () => {
        const element = document.getElementById('patient-id-card');
        if (!element) return;

        try {
            const filter = (node) => {
                if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
                    return false;
                }
                return true;
            };

            const dataUrl = await htmlToImage.toPng(element, {
                cacheBust: true,
                skipAutoScale: true,
                filter: filter,
                pixelRatio: 2,
                backgroundColor: 'transparent',
            });

            const link = document.createElement('a');
            link.download = `${patient.fullName.replace(/\s+/g, '_')}_ID_Card.png`;
            link.href = dataUrl;
            link.click();
            toast.success('ID Card downloaded');
        } catch (error) {
            console.error('Download failed', error);
            toast.error('Failed to download ID Card');
        }
    };

    const handlePrintCard = () => {
        const element = document.getElementById('patient-id-card');
        if (!element) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print ID Card</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                        .card-container { transform: scale(1.5); transform-origin: center; }
                    </style>
                </head>
                <body>
                    <div class="card-container">
                        ${element.outerHTML}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const handleDownloadQR = async () => {
        try {
            const imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/emergency/${patient.qrToken}`)}`;
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
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!patient) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 hidden md:block fixed h-full z-10">
                <div className="p-6">
                    <div className="flex items-center space-x-3 mb-8">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold text-slate-900">SmartHealth</span>
                    </div>

                    <nav className="space-y-1">
                        <Link to="/patient/dashboard" className="flex items-center px-4 py-3 text-primary bg-blue-50 rounded-xl font-medium transition-colors">
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            Dashboard
                        </Link>
                        <Link to="#" className="flex items-center px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors">
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Medical Records
                        </Link>
                        <Link to="#" className="flex items-center px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors">
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Settings
                        </Link>
                    </nav>
                </div>
                <div className="absolute bottom-0 w-full p-6 border-t border-slate-200">
                    <button onClick={logout} className="flex items-center text-slate-600 hover:text-red-600 transition-colors font-medium w-full">
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {patient.fullName.split(' ')[0]}</h1>
                        <p className="text-slate-500">Here's your health overview</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                            <img
                                src={patient.photoUrl
                                    ? (patient.photoUrl.startsWith('http') ? patient.photoUrl : `${import.meta.env.VITE_API_URL || ''}${patient.photoUrl}`)
                                    : `https://ui-avatars.com/api/?name=${patient.fullName}&background=0D8ABC&color=fff`
                                }
                                alt={patient.fullName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </header>

                {/* Medical ID Card Section - MOVED TO TOP */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-900">Medical ID Card</h2>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleDownloadCard}
                                className="flex items-center px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors shadow-sm"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Card
                            </button>
                            <button
                                onClick={handleDownloadQR}
                                className="flex items-center px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors shadow-sm"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                                QR Only
                            </button>
                            <button
                                onClick={handlePrintCard}
                                className="flex items-center px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Print
                            </button>
                        </div>
                    </div>

                    {/* ID Card Component */}
                    <div
                        id="patient-id-card"
                        className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-blue-500 to-teal-400 p-6 text-white aspect-[1.586/1] max-w-xl mx-auto lg:mx-0"
                    >
                        {/* Background Pattern */}
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-black/10 rounded-full blur-2xl"></div>

                        <div className="relative z-10 flex justify-between h-full">
                            {/* Left Side: Info */}
                            <div className="flex flex-col justify-between flex-1 pr-4">
                                <div>
                                    <div className="flex items-center space-x-2 mb-1 opacity-90">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                        </svg>
                                        <span className="text-xs font-bold uppercase tracking-wider">Medical ID</span>
                                    </div>
                                    <h3 className="text-2xl font-bold truncate mb-3">{patient.fullName}</h3>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>{patient.age} years</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                            </svg>
                                            <span className="font-bold bg-white/20 px-2 py-0.5 rounded text-xs">{patient.bloodGroup}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <span className="truncate">{patient.phoneNumber || patient.emergencyContact?.phone || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2 pt-2 border-t border-white/20">
                                    <p className="text-[10px] opacity-80 leading-tight">
                                        Scan QR for full medical profile & emergency contacts.
                                    </p>
                                </div>
                            </div>

                            {/* Right Side: Avatar & QR */}
                            <div className="flex flex-col justify-between items-end">
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center overflow-hidden mb-2">
                                    {patient.photoUrl ? (
                                        <img
                                            src={patient.photoUrl.startsWith('http') ? patient.photoUrl : `${import.meta.env.VITE_API_URL || ''}${patient.photoUrl}`}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.style.display = 'none';
                                                e.target.parentNode.innerHTML = `<span class="text-lg font-bold">${patient.fullName.charAt(0)}</span>`;
                                            }}
                                        />
                                    ) : (
                                        <span className="text-lg font-bold">{patient.fullName.charAt(0)}</span>
                                    )}
                                </div>

                                {/* QR Code */}
                                <div className="bg-white p-1.5 rounded-lg shadow-sm">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/emergency/${patient.qrToken}`)}`}
                                        alt="QR Code"
                                        className="w-20 h-20"
                                        crossOrigin="anonymous"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Overall Medical Summary Section */}
                {patient.aiCombinedSummary && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 rounded-xl shadow-lg bg-gradient-to-r from-teal-50 to-green-50 border border-teal-100 overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex items-center mb-6">
                                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-2xl mr-4 shadow-sm">
                                    🧠
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-teal-900">AI Overall Medical Summary</h2>
                                    <p className="text-sm text-teal-600">
                                        Consolidated analysis of all your reports • Last updated: {new Date(patient.aiLastUpdatedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Overall Summary */}
                            <div className="bg-white/60 rounded-xl p-5 mb-6 border border-teal-100/50">
                                <h3 className="font-bold text-teal-800 mb-2 flex items-center">
                                    <span className="mr-2">📋</span> Overall Summary
                                </h3>
                                <p className="text-teal-900 leading-relaxed">
                                    {patient.aiCombinedSummary}
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Detailed Breakdown */}
                                <div className="bg-white/60 rounded-xl p-5 border border-teal-100/50">
                                    <h3 className="font-bold text-teal-800 mb-4 flex items-center">
                                        <span className="mr-2">🔍</span> Detailed Breakdown
                                    </h3>
                                    <div className="prose prose-sm prose-teal max-w-none whitespace-pre-wrap">
                                        {patient.aiDetailedBreakdown}
                                    </div>
                                </div>

                                {/* Lifestyle Advice */}
                                <div className="bg-white/60 rounded-xl p-5 border border-teal-100/50">
                                    <h3 className="font-bold text-teal-800 mb-4 flex items-center">
                                        <span className="mr-2">🌿</span> Lifestyle & Diet
                                    </h3>
                                    <ul className="space-y-3">
                                        {patient.aiLifestyleAdvice?.map((advice, index) => (
                                            <li key={index} className="flex items-start text-teal-900 bg-teal-50/50 p-3 rounded-lg">
                                                <span className="mr-2 mt-0.5">✨</span>
                                                {advice}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* AI Summary Section (Individual Report) - Keeping for backward compatibility or specific report focus if needed, 
                    but user asked to "Add a new section at the top below the ID card". 
                    The existing "AI Summary Section" was for the *latest* report or patient specific summary. 
                    The new one is "Overall". 
                    I will keep the existing one as "Latest Report Insight" if it differs, or maybe hide it if it's redundant.
                    The user didn't ask to remove the old one, just "Add a new section".
                */}
                {patient.aiSummary && !patient.aiCombinedSummary && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-[1px] shadow-lg shadow-indigo-500/20"
                    >
                        <div className="bg-white rounded-[15px] p-6">
                            <div className="flex items-center mb-4">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl mr-4">
                                    ✨
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Latest Report Insight</h3>
                                    <p className="text-xs text-slate-500">
                                        Last updated: {new Date(patient.aiLastUpdatedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="prose prose-sm max-w-none text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                {patient.aiSummary}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* AI Report Suggestions Section */}
                <AIReportSuggestions />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Quick Stats / Info */}
                    <div className="lg:col-span-3 space-y-6">
                        <h2 className="text-xl font-bold text-slate-900">Health Overview</h2>

                        <div className="glass-card p-6 space-y-6">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Allergies</h4>
                                <div className="flex flex-wrap gap-2">
                                    {patient.allergies?.length > 0 ? (
                                        patient.allergies.map((item, i) => (
                                            <span key={i} className="badge-high">{item}</span>
                                        ))
                                    ) : (
                                        <span className="text-sm text-slate-400">No known allergies</span>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Conditions</h4>
                                <div className="flex flex-wrap gap-2">
                                    {patient.medicalConditions?.length > 0 ? (
                                        patient.medicalConditions.map((item, i) => (
                                            <span key={i} className="badge-medium">{item}</span>
                                        ))
                                    ) : (
                                        <span className="text-sm text-slate-400">None recorded</span>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Medications</h4>
                                <ul className="space-y-2">
                                    {patient.medications?.length > 0 ? (
                                        patient.medications.map((item, i) => (
                                            <li key={i} className="flex items-center text-sm text-slate-700">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2"></div>
                                                {item}
                                            </li>
                                        ))
                                    ) : (
                                        <span className="text-sm text-slate-400">No active medications</span>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const AIReportSuggestions = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await axios.get('/reports/patient');
                if (response.data.success) {
                    // Filter reports that have AI suggestions or summary
                    const aiReports = response.data.reports.filter(r => r.aiSummary || (r.aiHealthSuggestions && r.aiHealthSuggestions.length > 0));
                    setReports(aiReports);
                }
            } catch (error) {
                console.error("Failed to fetch reports", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    if (loading) return <div className="animate-pulse h-32 bg-slate-100 rounded-xl mb-8"></div>;
    if (reports.length === 0) return null;

    return (
        <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <span className="mr-2">🧠</span> AI Health Suggestions
            </h2>
            <div className="grid gap-4">
                {reports.map((rep) => (
                    <div key={rep._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">{rep.aiCategory || rep.title || "Medical Report"}</h3>
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mt-1">
                                    {new Date(rep.reportDate).toLocaleDateString()} • {rep.reportType}
                                </p>
                            </div>
                            {rep.aiCategory && (
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full">
                                    {rep.aiCategory}
                                </span>
                            )}
                        </div>

                        {rep.aiSummary && (
                            <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed">
                                {rep.aiSummary}
                            </div>
                        )}

                        {rep.aiHealthSuggestions?.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center">
                                    <span className="text-green-500 mr-2">✓</span> Suggested Actions
                                </h4>
                                <ul className="grid gap-2 sm:grid-cols-2">
                                    {rep.aiHealthSuggestions.map((s, i) => (
                                        <li key={i} className="flex items-start text-sm text-slate-600 bg-green-50/50 p-2 rounded-lg">
                                            <span className="mr-2 mt-0.5">🥗</span>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
};

export default PatientDashboard;
