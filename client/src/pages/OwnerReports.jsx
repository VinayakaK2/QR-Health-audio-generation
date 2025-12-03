import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import axios from '../api/axios';
import toast from 'react-hot-toast';

const OwnerReports = () => {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [allReports, setAllReports] = useState([]);
    const [filters, setFilters] = useState({
        hospital: '',
        reportType: '',
        riskLevel: ''
    });
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isSuperAdmin) {
            navigate('/dashboard');
            return;
        }
        fetchData();
    }, [isSuperAdmin]);

    const fetchData = async () => {
        try {
            const [reportsRes, hospitalsRes] = await Promise.all([
                axios.get('/admin/reports'),
                axios.get('/admin/hospitals')
            ]);
            setReports(reportsRes.data.reports);
            setAllReports(reportsRes.data.reports);
            setHospitals(hospitalsRes.data.hospitals);
        } catch (error) {
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Apply filters
        let filtered = [...allReports];

        if (filters.hospital) {
            filtered = filtered.filter(r => r.hospital?._id === filters.hospital);
        }
        if (filters.reportType) {
            filtered = filtered.filter(r => r.reportType === filters.reportType);
        }
        if (filters.riskLevel) {
            filtered = filtered.filter(r => r.patient?.riskLevel === filters.riskLevel);
        }

        setReports(filtered);
    }, [filters, allReports]);

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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Global Patient Reports</h1>
                    <p className="text-gray-600">View all medical reports across all hospitals ({reports.length} total)</p>
                </div>

                {/* Filters */}
                <div className="card mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Hospital</label>
                            <select
                                value={filters.hospital}
                                onChange={(e) => setFilters({ ...filters, hospital: e.target.value })}
                                className="input-field"
                            >
                                <option value="">All Hospitals</option>
                                {hospitals.map(h => (
                                    <option key={h._id} value={h._id}>{h.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                            <select
                                value={filters.reportType}
                                onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}
                                className="input-field"
                            >
                                <option value="">All Types</option>
                                <option value="Lab">Lab</option>
                                <option value="Scan">Scan</option>
                                <option value="Prescription">Prescription</option>
                                <option value="Consultation">Consultation</option>
                                <option value="Surgery">Surgery</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
                            <select
                                value={filters.riskLevel}
                                onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
                                className="input-field"
                            >
                                <option value="">All Levels</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Reports Table */}
                {reports.length === 0 ? (
                    <div className="card text-center py-12">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-600 text-lg">No reports found</p>
                    </div>
                ) : (
                    <div className="card overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Report Title</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Patient</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Hospital</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Risk</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">File</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {reports.map((report) => (
                                        <tr key={report._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">{report.title}</div>
                                                {report.description && (
                                                    <div className="text-sm text-gray-500 mt-1">{report.description.substring(0, 50)}{report.description.length > 50 ? '...' : ''}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">{report.patient?.fullName || 'N/A'}</div>
                                                <div className="text-sm text-gray-500">{report.patient?.bloodGroup || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{report.hospital?.name || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                                    {report.reportType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={getRiskBadge(report.patient?.riskLevel)}>
                                                    {report.patient?.riskLevel || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(report.reportDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {report.reportFileUrl ? (
                                                    <a
                                                        href={report.reportFileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-secondary hover:underline text-sm"
                                                    >
                                                        View File
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">No file</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OwnerReports;
