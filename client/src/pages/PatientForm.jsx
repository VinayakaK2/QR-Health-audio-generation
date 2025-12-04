import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import FaceCapture from '../components/FaceCapture';
import axios from '../api/axios';
import toast from 'react-hot-toast';

const PatientForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isSuperAdmin } = useAuth();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [hospitals, setHospitals] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        hospital: '', // Add hospital field
        email: '',
        password: '',
        age: '',
        gender: 'Male',
        photoUrl: '',
        bloodGroup: 'O+',
        allergies: '',
        medicalConditions: '',
        medications: '',
        emergencyContact: {
            name: '',
            phone: '',
            email: ''
        },
        faceDescriptor: null
    });

    useEffect(() => {
        if (isSuperAdmin) {
            fetchHospitals();
        }
        if (isEditMode) {
            fetchPatient();
        }
    }, [id, isSuperAdmin]);

    const fetchHospitals = async () => {
        try {
            const response = await axios.get('/hospitals?status=APPROVED');
            setHospitals(response.data.hospitals);
        } catch (error) {
            console.error('Failed to fetch hospitals', error);
            toast.error('Failed to load hospitals list');
        }
    };

    const fetchPatient = async () => {
        try {
            const response = await axios.get(`/patients/${id}`);
            const patient = response.data.patient;
            setFormData({
                fullName: patient.fullName,
                hospital: patient.hospital,
                email: patient.email || '',
                password: '', // Don't populate password
                age: patient.age,
                gender: patient.gender,
                photoUrl: patient.photoUrl || '',
                bloodGroup: patient.bloodGroup,
                allergies: patient.allergies ? patient.allergies.join(', ') : '',
                medicalConditions: patient.medicalConditions ? patient.medicalConditions.join(', ') : '',
                medications: patient.medications ? patient.medications.join(', ') : '',
                emergencyContact: patient.emergencyContact,
                faceDescriptor: null // Don't populate face descriptor for now
            });
        } catch (error) {
            toast.error('Failed to load patient data');
            navigate('/patients');
        }
    };

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

    const handleAutoFill = () => {
        setFormData({
            fullName: 'John Doe',
            email: `john.doe.${Math.floor(Math.random() * 1000)}@example.com`,
            password: 'password123',
            age: '30',
            gender: 'Male',
            photoUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
            bloodGroup: 'O+',
            allergies: 'Peanuts',
            medicalConditions: 'None',
            medications: 'None',
            emergencyContact: {
                name: 'Jane Doe',
                phone: '9876543210',
                email: 'jane@example.com'
            },
            faceDescriptor: null
        });
        toast.success('Form auto-filled with dummy data');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.fullName || !formData.age || !formData.emergencyContact.name || !formData.emergencyContact.phone) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (isSuperAdmin && !formData.hospital) {
            toast.error('Please select a hospital');
            return;
        }

        setLoading(true);

        try {
            const submitData = {
                ...formData,
                age: parseInt(formData.age),
                allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
                medicalConditions: formData.medicalConditions ? formData.medicalConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
                medications: formData.medications ? formData.medications.split(',').map(s => s.trim()).filter(Boolean) : []
            };

            if (isEditMode) {
                const response = await axios.put(`/patients/${id}`, submitData);
                if (response.data.requestPending) {
                    toast.success('Update request sent to Admin for approval');
                } else {
                    toast.success('Patient updated successfully');
                }
            } else {
                await axios.post('/patients', submitData);
                toast.success('Patient created successfully');
            }

            navigate('/patients');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8 flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    {isEditMode ? 'Edit Patient' : 'Add New Patient'}
                                </h1>
                                <p className="text-gray-600">
                                    {isEditMode ? 'Update patient information' : 'Create a new patient record with QR code'}
                                </p>
                            </div>
                            {!isEditMode && (
                                <button
                                    type="button"
                                    onClick={handleAutoFill}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                                >
                                    Auto Fill Dummy Data
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="card">
                            <div className="space-y-6">

                                {/* Hospital Selection for Super Admin */}
                                {isSuperAdmin && (
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Hospital Assignment</h2>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Select Hospital <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="hospital"
                                                value={formData.hospital}
                                                onChange={handleChange}
                                                className="input-field"
                                                required
                                            >
                                                <option value="">Select a hospital...</option>
                                                {hospitals.map(hospital => (
                                                    <option key={hospital._id} value={hospital._id}>
                                                        {hospital.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Personal Information */}
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleChange}
                                                className="input-field"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="input-field"
                                                placeholder="patient@example.com"
                                            />
                                        </div>

                                        {!isEditMode && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Password <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        name="password"
                                                        value={formData.password}
                                                        onChange={handleChange}
                                                        className="input-field pr-10"
                                                        placeholder="Set a password for patient portal"
                                                        required
                                                        minLength={6}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showPassword ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                            </svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                    <div className="md:col-span-2 mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Face Authentication (Optional)
                                        </label>
                                        <div className="flex items-center space-x-4">
                                            <FaceCapture
                                                onCapture={(descriptor) => setFormData(prev => ({ ...prev, faceDescriptor: descriptor }))}
                                                label={formData.faceDescriptor ? "Retake Face Scan" : "Scan Face"}
                                            />
                                            {formData.faceDescriptor && (
                                                <span className="text-green-600 flex items-center text-sm font-medium">
                                                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Face Data Captured
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Scanning the face allows the patient to log in securely using facial recognition.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Age <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                name="age"
                                                value={formData.age}
                                                onChange={handleChange}
                                                className="input-field"
                                                min="0"
                                                max="150"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Gender <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="gender"
                                                value={formData.gender}
                                                onChange={handleChange}
                                                className="input-field"
                                                required
                                            >
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Blood Group <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="bloodGroup"
                                                value={formData.bloodGroup}
                                                onChange={handleChange}
                                                className="input-field"
                                                required
                                            >
                                                <option value="A+">A+</option>
                                                <option value="A-">A-</option>
                                                <option value="B+">B+</option>
                                                <option value="B-">B-</option>
                                                <option value="AB+">AB+</option>
                                                <option value="AB-">AB-</option>
                                                <option value="O+">O+</option>
                                                <option value="O-">O-</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Photo URL (Optional)
                                            </label>
                                            <input
                                                type="url"
                                                name="photoUrl"
                                                value={formData.photoUrl}
                                                onChange={handleChange}
                                                className="input-field"
                                                placeholder="https://example.com/photo.jpg"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Medical Information */}
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Medical Information</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Allergies (comma-separated)
                                            </label>
                                            <input
                                                type="text"
                                                name="allergies"
                                                value={formData.allergies}
                                                onChange={handleChange}
                                                className="input-field"
                                                placeholder="Penicillin, Peanuts, Latex"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Medical Conditions (comma-separated)
                                            </label>
                                            <input
                                                type="text"
                                                name="medicalConditions"
                                                value={formData.medicalConditions}
                                                onChange={handleChange}
                                                className="input-field"
                                                placeholder="Diabetes, Hypertension, Asthma"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Current Medications (comma-separated)
                                            </label>
                                            <input
                                                type="text"
                                                name="medications"
                                                value={formData.medications}
                                                onChange={handleChange}
                                                className="input-field"
                                                placeholder="Metformin, Lisinopril, Aspirin"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Emergency Contact */}
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Emergency Contact</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Contact Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="emergencyContact.name"
                                                value={formData.emergencyContact.name}
                                                onChange={handleChange}
                                                className="input-field"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Contact Phone <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                name="emergencyContact.phone"
                                                value={formData.emergencyContact.phone}
                                                onChange={handleChange}
                                                className="input-field"
                                                placeholder="+919876543210"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Contact Email
                                            </label>
                                            <input
                                                type="email"
                                                name="emergencyContact.email"
                                                value={formData.emergencyContact.email}
                                                onChange={handleChange}
                                                className="input-field"
                                                placeholder="emergency@example.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/patients')}
                                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <span className="flex items-center">
                                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                {isEditMode ? 'Updating...' : 'Creating...'}
                                            </span>
                                        ) : (
                                            isEditMode ? 'Update Patient' : 'Create Patient'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PatientForm;
