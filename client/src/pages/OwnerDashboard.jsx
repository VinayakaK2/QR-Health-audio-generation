import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import StatsCard from '../components/StatsCard';
import axios from '../api/axios';
import toast from 'react-hot-toast';

const OwnerDashboard = () => {
    const { isSuperAdmin } = useAuth();
    const [stats, setStats] = useState({
        totalHospitals: 0,
        totalPatients: 0,
        approvedHospitals: 0,
        pendingHospitals: 0
    });
    const [recentPatients, setRecentPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchData();
        }
    }, [isSuperAdmin]);

    const fetchData = async () => {
        try {
            const [hospitalsRes, patientsRes] = await Promise.all([
                axios.get('/admin/hospitals'),
                axios.get('/admin/patients')
            ]);

            const hospitals = hospitalsRes.data.hospitals;
            const patients = patientsRes.data.patients;

            setStats({
                totalHospitals: hospitals.length,
                totalPatients: patients.length,
                approvedHospitals: hospitals.filter(h => h.status === 'APPROVED').length,
                pendingHospitals: hospitals.filter(h => h.status === 'PENDING').length
            });

            // Get recent 10 patients
            setRecentPatients(patients.slice(0, 10));
        } catch (error) {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const getRiskBadge = (riskLevel) => {
        const badges = {
            High: 'badge-high',
            Medium: 'badge-medium',
            Low: 'badge-low'
        };
        return badges[riskLevel] || 'badge-low';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-7xl mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">System Owner Dashboard</h1>
                    <p className="text-gray-600">Global overview of all hospitals and patients</p>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatsCard
                        title="Total Hospitals"
                        value={stats.totalHospitals}
                        color="secondary"
                        icon={
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        }
                    />

                    <StatsCard
                        title="Total Patients"
                        value={stats.totalPatients}
                        color="primary"
                        icon={
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        }
                    />

                    <StatsCard
                        title="Approved Hospitals"
                        value={stats.approvedHospitals}
                        color="success"
                        icon={
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />

                    <StatsCard
                        title="Pending Approvals"
                        value={stats.pendingHospitals}
                        color="warning"
                        icon={
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Link to="/owner/hospitals" className="card hover:scale-105 transition-transform cursor-pointer">
                        <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0 w-16 h-16 bg-secondary rounded-xl flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Manage Hospitals</h3>
                                <p className="text-gray-600 text-sm">View and approve hospital registrations</p>
                            </div>
                        </div>
                    </Link>

                    <div className="card">
                        <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0 w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Global Patient View</h3>
                                <p className="text-gray-600 text-sm">See all patients across all hospitals</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Patients Table */}
                <div className="card">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Recent Patients (All Hospitals)</h2>
                    </div>

                    {recentPatients.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No patients found</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Patient</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Hospital</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Age/Gender</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Blood Group</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Risk Level</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {recentPatients.map((patient) => (
                                        <tr key={patient._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-semibold text-gray-900">{patient.fullName}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{patient.hospital?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{patient.age} / {patient.gender}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                                                    {patient.bloodGroup}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={getRiskBadge(patient.riskLevel)}>
                                                    {patient.riskLevel}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OwnerDashboard;
