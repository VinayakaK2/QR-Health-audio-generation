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
    const [uploading, setUploading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [aiValidationResult, setAiValidationResult] = useState(null);

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
        setAiValidationResult(null);
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
                                    Report File (Image or PDF)
                                </label>
                                <div className="flex items-center space-x-4">
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;

                                            const formData = new FormData();
                                            formData.append('file', file);

                                            setUploading(true);
                                            try {
                                                const response = await axios.post('/upload', formData, {
                                                    headers: {
                                                        'Content-Type': 'multipart/form-data'
                                                    }
                                                });
                                                setFormData(prev => ({ ...prev, reportFileUrl: response.data.fileUrl }));
                                                toast.success('File uploaded successfully');

                                                // Trigger AI Analysis
                                                setValidating(true);
                                                try {
                                                    // We need the fileUrl that was just set in formData, but state updates are async.
                                                    // So we use the response.data.fileUrl we just got.
                                                    console.log("Upload successful, response:", response.data);
                                                    const fileUrl = response.data.fileUrl;

                                                    if (!fileUrl) {
                                                        throw new Error("No file URL received from upload server");
                                                    }

                                                    console.log("Sending to AI Validate:", { fileUrl, fileName: file.name });

                                                    const validationResponse = await axios.post('/reports/ai-validate', {
                                                        uploadedFiles: [{
                                                            fileName: file.name,
                                                            mimeType: file.type,
                                                            size: file.size,
                                                            fileUrl: fileUrl
                                                        }]
                                                    });
                                                    setAiValidationResult(validationResponse.data.validationResult);
                                                } catch (error) {
                                                    console.error("AI Analysis failed", error);
                                                    const errMsg = error.response?.data?.message || error.message;
                                                    toast.error(`AI Analysis failed: ${errMsg}`);
                                                } finally {
                                                    setValidating(false);
                                                }

                                            } catch (error) {
                                                toast.error('File upload failed');
                                                setUploading(false);
                                            }
                                        }}
                                        className="block w-full text-sm text-gray-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-full file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-blue-50 file:text-blue-700
                                            hover:file:bg-blue-100"
                                    />
                                    {uploading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>}
                                </div>
                                {formData.reportFileUrl && (
                                    <p className="mt-2 text-sm text-green-600 flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        File attached
                                    </p>
                                )}
                            </div>

                            {/* AI Analysis Results */}
                            {validating && (
                                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center space-x-3 md:col-span-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                                    <span className="text-sm text-slate-600">Analyzing report content...</span>
                                </div>
                            )}

                            {aiValidationResult && (
                                <div className="mt-4 border rounded-xl p-4 bg-white shadow-sm md:col-span-2">
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-800">
                                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                        AI Report Analysis
                                    </h3>

                                    <div className="space-y-3">
                                        {/* Report Category */}
                                        <div className="flex items-center justify-between p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                                            <span className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Category</span>
                                            <span className="text-sm font-bold text-indigo-900">{aiValidationResult.reportCategory}</span>
                                        </div>

                                        {/* Detected Panels */}
                                        {aiValidationResult.detectedPanels && aiValidationResult.detectedPanels.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Detected Panels</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {aiValidationResult.detectedPanels.map((panel, idx) => (
                                                        <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs border border-slate-200">
                                                            {panel}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Key Findings */}
                                        {aiValidationResult.keyFindings && (
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Key Findings</h4>
                                                <p className="text-sm text-slate-700 leading-relaxed">
                                                    {aiValidationResult.keyFindings}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
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
