import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import * as htmlToImage from 'html-to-image';

const HospitalIdCards = () => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredPatients, setFilteredPatients] = useState([]);

    useEffect(() => {
        fetchPatients();
    }, []);

    useEffect(() => {
        const filtered = patients.filter(patient =>
            patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.bloodGroup.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredPatients(filtered);
    }, [searchTerm, patients]);

    const fetchPatients = async () => {
        try {
            const response = await axios.get('/patients');
            setPatients(response.data.patients);
            setFilteredPatients(response.data.patients);
        } catch (error) {
            toast.error('Failed to load patients');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (patientId, patientName) => {
        const element = document.getElementById(`id-card-${patientId}`);
        if (!element) return;

        try {
            // Filter out external stylesheets that might cause CORS issues
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
                pixelRatio: 2, // Better quality
                backgroundColor: 'transparent',
            });

            const link = document.createElement('a');
            link.download = `${patientName.replace(/\s+/g, '_')}_ID_Card.png`;
            link.href = dataUrl;
            link.click();
            toast.success('ID Card downloaded');
        } catch (error) {
            console.error('Download failed', error);
            toast.error('Failed to download ID Card. Please try again.');
        }
    };

    const handlePrint = (patientId) => {
        const element = document.getElementById(`id-card-${patientId}`);
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

    const handleShare = async (patient) => {
        const emergencyUrl = `${window.location.origin}/emergency/${patient.qrToken}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${patient.fullName}'s Medical ID`,
                    text: 'Check out my SmartHealth Medical ID',
                    url: emergencyUrl
                });
            } catch (error) {
                console.log('Error sharing', error);
            }
        } else {
            navigator.clipboard.writeText(emergencyUrl);
            toast.success('Emergency link copied to clipboard');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar />

            <main className="flex-1 md:ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Patient ID Cards</h1>
                        <p className="text-slate-500 mt-1">View and download QR-based medical ID cards for all registered patients</p>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-8">
                        <input
                            type="text"
                            placeholder="Search by name or blood group..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full max-w-md px-4 py-2 rounded-xl border border-slate-200 focus:border-primary focus:ring focus:ring-primary/20 outline-none transition-all"
                        />
                    </div>

                    {/* Cards Grid */}
                    {filteredPatients.length === 0 ? (
                        <div className="text-center py-16 glass-card">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0c0 .884-.95 2-2.122 2H6.5" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">No patients found</h3>
                            <p className="text-slate-500 mt-1">Try adjusting your search or add new patients</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredPatients.map((patient) => (
                                <motion.div
                                    key={patient._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col space-y-4"
                                >
                                    {/* ID Card Component */}
                                    <div
                                        id={`id-card-${patient._id}`}
                                        className="relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br from-blue-500 to-teal-400 p-6 text-white aspect-[1.586/1]"
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
                                                    <h3 className="text-xl font-bold truncate mb-3">{patient.fullName}</h3>

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
                                                            src={patient.photoUrl}
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

                                    {/* Actions */}
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleDownload(patient._id, patient.fullName)}
                                            className="flex-1 flex items-center justify-center px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors shadow-sm"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Download
                                        </button>
                                        <button
                                            onClick={() => handlePrint(patient._id)}
                                            className="flex items-center justify-center px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                                            title="Print"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleShare(patient)}
                                            className="flex items-center justify-center px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                                            title="Share"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                            </svg>
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default HospitalIdCards;
