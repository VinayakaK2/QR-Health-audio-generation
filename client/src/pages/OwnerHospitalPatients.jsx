import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios from '../api/axios';
import toast from 'react-hot-toast';

const OwnerHospitalPatients = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [hospital, setHospital] = useState(null);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHospitalPatients();
    }, [id]);

    const fetchHospitalPatients = async () => {
        try {
            const response = await axios.get(`/admin/hospitals/${id}/patients`);
            setHospital(response.data.hospital);
            setPatients(response.data.patients);
        } catch (error) {
            toast.error('Failed to load hospital patients');
            navigate('/owner/hospitals');
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
                    <button
                        onClick={() => navigate('/owner/hospitals')}
                        className="mb-4 text-secondary hover:underline flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back to Hospitals</span>
                    </button>

                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {hospital?.name} - Patients
                    </h1>
                    <p className="text-gray-600">
                        Read-only view of patients at this hospital ({patients.length} total)
                    </p>
                </div>

                {patients.length === 0 ? (
                    <div className="card text-center py-12">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-gray-600 text-lg">This hospital has no patients yet</p>
                    </div>
                ) : (
                    <div className="card overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Patient Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Age / Gender</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Blood Group</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Risk Level</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Emergency Contact</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {patients.map((patient) => (
                                        <tr key={patient._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-semibold text-gray-900">{patient.fullName}</td>
                                            <td className="px-6 py-4 text-gray-600">{patient.age} / {patient.gender}</td>
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
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                <div>{patient.emergencyContact.name}</div>
                                                <div className="text-gray-500">{patient.emergencyContact.phone}</div>
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

export default OwnerHospitalPatients;
