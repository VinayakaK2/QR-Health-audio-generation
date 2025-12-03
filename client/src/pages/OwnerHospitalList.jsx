import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import axios from '../api/axios';
import toast from 'react-hot-toast';

const OwnerHospitalList = () => {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [hospitals, setHospitals] = useState([]);
    const [filter, setFilter] = useState('PENDING');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isSuperAdmin) {
            navigate('/dashboard');
            return;
        }
        fetchHospitals();
    }, [filter, isSuperAdmin]);

    const fetchHospitals = async () => {
        try {
            // Use admin API that includes patient counts
            const response = await axios.get('/admin/hospitals');
            let hospitalData = response.data.hospitals;

            // Apply filter if needed
            if (filter) {
                hospitalData = hospitalData.filter(h => h.status === filter);
            }

            setHospitals(hospitalData);
        } catch (error) {
            toast.error('Failed to load hospitals');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id, name) => {
        if (!window.confirm(`Approve hospital: ${name}?`)) {
            return;
        }

        try {
            await axios.patch(`/hospitals/${id}/approve`);
            toast.success('Hospital approved successfully');
            fetchHospitals();
        } catch (error) {
            toast.error('Failed to approve hospital');
        }
    };

    const handleReject = async (id, name) => {
        if (!window.confirm(`Reject hospital: ${name}?`)) {
            return;
        }

        try {
            await axios.patch(`/hospitals/${id}/reject`);
            toast.success('Hospital rejected');
            fetchHospitals();
        } catch (error) {
            toast.error('Failed to reject hospital');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            APPROVED: 'bg-green-100 text-green-800',
            REJECTED: 'bg-red-100 text-red-800'
        };
        return `inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${badges[status] || ''}`;
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
                    <Link to="/owner/dashboard" className="text-secondary hover:underline mb-4 inline-block">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Hospital Management</h1>
                    <p className="text-gray-600">System Owner Portal - Approve or reject hospital registrations</p>
                </div>

                {/* Filter Tabs */}
                <div className="mb-6 flex space-x-2">
                    {['PENDING', 'APPROVED', 'REJECTED', ''].map((status) => (
                        <button
                            key={status || 'ALL'}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === status
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {status || 'ALL'}
                        </button>
                    ))}
                </div>

                {/* Hospitals Table */}
                {hospitals.length === 0 ? (
                    <div className="card text-center py-12">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-gray-600 text-lg">No {filter.toLowerCase()} hospitals found</p>
                    </div>
                ) : (
                    <div className="card overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Hospital</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Admin User</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Patients</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {hospitals.map((hospital) => (
                                        <tr key={hospital._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="font-semibold text-gray-900">{hospital.name}</div>
                                                    <div className="text-sm text-gray-500">{hospital.email}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                <div>{hospital.phone || 'N/A'}</div>
                                                <div className="text-gray-500">{hospital.primaryContactName || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm">
                                                    <div className="text-gray-900">{hospital.adminUser?.name || 'N/A'}</div>
                                                    <div className="text-gray-500">{hospital.adminUser?.email || 'N/A'}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link
                                                    to={`/owner/hospitals/${hospital._id}/patients`}
                                                    className="inline-flex items-center space-x-1 text-secondary hover:underline"
                                                >
                                                    <span className="font-semibold">{hospital.patientCount || 0}</span>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={getStatusBadge(hospital.status)}>
                                                    {hospital.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end space-x-2">
                                                    {hospital.status === 'PENDING' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(hospital._id, hospital.name)}
                                                                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(hospital._id, hospital.name)}
                                                                className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm font-medium"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {hospital.status === 'APPROVED' && (
                                                        <button
                                                            onClick={() => handleReject(hospital._id, hospital.name)}
                                                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                                                        >
                                                            Revoke
                                                        </button>
                                                    )}
                                                    {hospital.status === 'REJECTED' && (
                                                        <button
                                                            onClick={() => handleApprove(hospital._id, hospital.name)}
                                                            className="px-3 py-1 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors text-sm font-medium"
                                                        >
                                                            Re-approve
                                                        </button>
                                                    )}
                                                </div>
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

export default OwnerHospitalList;
