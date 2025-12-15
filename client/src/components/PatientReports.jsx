import { useState, useEffect } from 'react';
import axios from '../api/axios';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';

const PatientReports = ({ patientId }) => {
    const { user } = useAuth();
    const isPatient = user?.role === 'PATIENT';
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingReport, setEditingReport] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        reportType: 'Other',
        reportDate: new Date().toISOString().split('T')[0],
        description: '',
        reportFileUrl: ''
    });
    const [uploading, setUploading] = useState(false);

    const [selectedFiles, setSelectedFiles] = useState([]);

    useEffect(() => {
        if (patientId) {
            fetchReports();
        }
    }, [patientId]);

    const fetchReports = async () => {
        try {
            const response = await axios.get(`/reports/patient/${patientId}`);
            setReports(response.data.reports);
        } catch (error) {
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prevent double submission
        if (uploading) return;

        setUploading(true);
        try {
            let finalFileUrl = formData.reportFileUrl;

            // 1. Upload files if any are selected
            if (selectedFiles.length > 0) {
                const uploadFormData = new FormData();
                selectedFiles.forEach(file => {
                    uploadFormData.append('files', file);
                });

                try {
                    const uploadResponse = await axios.post('/upload/multiple', uploadFormData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    // Use first file URL as primary
                    finalFileUrl = uploadResponse.data.fileUrls[0];
                } catch (uploadError) {
                    console.error("Upload failed", uploadError);
                    toast.error('File upload failed');
                    setUploading(false);
                    return;
                }
            }

            // 2. Submit Report Data
            const reportPayload = {
                ...formData,
                reportFileUrl: finalFileUrl,
                patientId
            };

            if (editingReport) {
                await axios.put(`/reports/${editingReport._id}`, reportPayload);
                toast.success('Report updated successfully');
            } else {
                await axios.post('/reports', reportPayload);
                toast.success('Report created successfully');
            }

            setShowForm(false);
            setEditingReport(null);
            resetForm();
            fetchReports();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save report');
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (report) => {
        setEditingReport(report);
        setFormData({
            title: report.title,
            reportType: report.reportType,
            reportDate: new Date(report.reportDate).toISOString().split('T')[0],
            description: report.description || '',
            reportFileUrl: report.reportFileUrl || ''
        });
        setSelectedFile(null); // Reset new file selection
        setShowForm(true);
    };

    const handleDelete = async (reportId) => {
        if (!window.confirm('Are you sure you want to delete this report?')) {
            return;
        }

        try {
            await axios.delete(`/reports/${reportId}`);
            toast.success('Report deleted successfully');
            fetchReports();
        } catch (error) {
            toast.error('Failed to delete report');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            reportType: 'Other',
            reportDate: new Date().toISOString().split('T')[0],
            description: '',
            reportFileUrl: ''
        });
        setSelectedFile(null);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingReport(null);
        resetForm();
    };

    if (loading) {
        return (
            <div className="card">
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Medical Reports</h2>
                <h2 className="text-xl font-semibold text-gray-900">Medical Reports</h2>
                {!showForm && !isPatient && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn-primary"
                    >
                        + Add Report
                    </button>
                )}
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {editingReport ? 'Edit Report' : 'Add New Report'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Report Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Report Type
                                </label>
                                <select
                                    value={formData.reportType}
                                    onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="Lab">Lab</option>
                                    <option value="Scan">Scan</option>
                                    <option value="Prescription">Prescription</option>
                                    <option value="Consultation">Consultation</option>
                                    <option value="Surgery">Surgery</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Report Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.reportDate}
                                    onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                                    className="input-field"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input-field"
                                    rows="3"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Report File (Image or PDF)
                                </label>
                                <div className="flex items-center space-x-4">
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        multiple
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                setSelectedFiles(Array.from(e.target.files));
                                            }
                                        }}
                                        className="block w-full text-sm text-gray-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-full file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-blue-50 file:text-blue-700
                                            hover:file:bg-blue-100"
                                    />
                                </div>
                                {selectedFiles.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        <p className="text-sm font-medium text-gray-700">Selected Files ({selectedFiles.length}):</p>
                                        {selectedFiles.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="truncate max-w-xs">{file.name}</span>
                                                    <span className="ml-2 text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
                                                    }}
                                                    className="text-red-500 hover:text-red-700 ml-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>


                        </div>

                        <div className="flex space-x-3">
                            <button type="submit" className="btn-primary" disabled={uploading}>
                                {uploading ? 'Uploading...' : (editingReport ? 'Update Report' : 'Create Report')}
                            </button>
                            <button type="button" onClick={handleCancel} className="btn-outline">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Reports List */}
            {reports.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600">No reports added yet</p>
                    {!isPatient && (
                        <p className="text-sm text-gray-500 mt-1">Click "Add Report" to create the first report</p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {reports.map((report) => (
                        <div key={report._id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                            {report.reportType}
                                        </span>
                                    </div>

                                    {report.description && (
                                        <p className="text-gray-600 text-sm mb-2">{report.description}</p>
                                    )}

                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <span>📅 {new Date(report.reportDate).toLocaleDateString()}</span>
                                        {report.createdBy?.name && (
                                            <span>👤 {report.createdBy.name}</span>
                                        )}
                                        {report.reportFileUrl && (
                                            <a
                                                href={report.reportFileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-secondary hover:underline"
                                            >
                                                📄 View File
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {!isPatient && (
                                    <div className="flex space-x-2 ml-4">
                                        <button
                                            onClick={() => handleEdit(report)}
                                            className="px-3 py-1 text-sm bg-secondary text-white rounded hover:bg-secondary-dark transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(report._id)}
                                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PatientReports;
