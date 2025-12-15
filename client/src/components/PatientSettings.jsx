import { useState, useEffect } from 'react';
import axios from '../api/axios';
import toast from 'react-hot-toast';

const PatientSettings = ({ patient, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '', // Based on usage in Dashboard, though schema says emergencyContact.phone, let's see. 
        // Schema has emergencyContact: { name, phone, email }. Patient root has no phone, only photoUrl.
        // Wait, PatientDashboard displays "patient.phoneNumber || patient.emergencyContact?.phone". 
        // The schema does NOT have a phoneNumber field at the root level!
        // It seems the Dashboard code implied it might exist. I should check the schema again. 
        // The schema definitely does NOT have `phoneNumber` at top level.
        // So I should probably bind to emergencyContact.phone if that's the primary phone.
        age: '',
        gender: 'Male',
        allergies: '',
        emergencyContact: {
            name: '',
            phone: '',
            email: ''
        }
    });



    useEffect(() => {
        if (patient) {
            setFormData({
                fullName: patient.fullName || '',
                email: patient.email || '',
                age: patient.age || '',
                gender: patient.gender || 'Male',
                allergies: patient.allergies ? patient.allergies.join(', ') : '',
                emergencyContact: {
                    name: patient.emergencyContact?.name || '',
                    phone: patient.emergencyContact?.phone || '',
                    email: patient.emergencyContact?.email || ''
                }
            });
        }
    }, [patient]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const submitData = {
                ...formData,
                age: parseInt(formData.age),
                allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : []
            };

            const response = await axios.put(`/patients/${patient._id}`, submitData);

            if (response.data.success) {
                toast.success('Profile updated successfully');
                if (onUpdate) onUpdate(response.data.patient);
                // Clear password fields

            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Profile Settings</h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Personal Info */}
                        <div className="md:col-span-2">
                            <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Personal Information</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Age</label>
                            <input
                                type="number"
                                name="age"
                                value={formData.age}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Gender</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>



                        {/* Medical Info */}
                        <div className="md:col-span-2 mt-4">
                            <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Medical History</h3>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Allergies</label>
                            <input
                                type="text"
                                name="allergies"
                                value={formData.allergies}
                                onChange={handleChange}
                                placeholder="Peanuts, Penicillin..."
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                            />
                        </div>

                        {/* Emergency Contact */}
                        <div className="md:col-span-2 mt-4">
                            <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Emergency Contact</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Contact Name</label>
                            <input
                                type="text"
                                name="emergencyContact.name"
                                value={formData.emergencyContact.name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Contact Phone</label>
                            <input
                                type="tel"
                                name="emergencyContact.phone"
                                value={formData.emergencyContact.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                required
                            />
                        </div>



                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30 flex items-center"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PatientSettings;
