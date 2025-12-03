import { useState, useEffect } from 'react';
import axios from '../api/axios';
import toast from 'react-hot-toast';

const PatientReports = ({ patientId }) => {
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

        try {
            if (editingReport) {
                await axios.put(`/reports/${editingReport._id}`, formData);
                toast.success('Report updated successfully');
            } else {
                await axios.post('/reports', { ...formData, patientId });
                toast.success('Report created successfully');
            }

            setShowForm(false);
            setEditingReport(null);
            resetForm();
            fetchReports();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save report');
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
                {!showForm && (
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
                                    Report File URL (optional)
                                </label>
                                <input
                                    type="url"
                                    value={formData.reportFileUrl}
                                    onChange={(e) => setFormData({ ...formData, reportFileUrl: e.target.value })}
                                    className="input-field"
                                    placeholder="https://example.com/report.pdf"
                                />
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button type="submit" className="btn-primary">
                                {editingReport ? 'Update Report' : 'Create Report'}
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
                    <p className="text-sm text-gray-500 mt-1">Click "Add Report" to create the first report</p>
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
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PatientReports;
