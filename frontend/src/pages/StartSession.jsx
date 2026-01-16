/**
 * StartSession Page
 * Allows teachers to start a new class session
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionService } from '../api/sessionService';
import { classService } from '../api/academicService';

export default function StartSession() {
  const navigate = useNavigate();
  
  // State
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingClasses, setFetchingClasses] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Update selected class details when selection changes
  useEffect(() => {
    if (selectedClassId) {
      const classData = classes.find(c => c.id === selectedClassId);
      setSelectedClass(classData);
    } else {
      setSelectedClass(null);
    }
  }, [selectedClassId, classes]);

  const fetchClasses = async () => {
    try {
      setFetchingClasses(true);
      const data = await classService.getAll();
      setClasses(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load classes');
      console.error('Error fetching classes:', err);
    } finally {
      setFetchingClasses(false);
    }
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    
    if (!selectedClassId) {
      setError('Please select a class');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const response = await sessionService.start(selectedClassId);
      
      setSuccess(response.message || 'Session started successfully!');
      
      // Reset form
      setSelectedClassId('');
      setSelectedClass(null);
      
      // Navigate to active sessions after 2 seconds
      setTimeout(() => {
        navigate('/active-sessions');
      }, 2000);
      
    } catch (err) {
      const errorMessage = err.response?.data?.class_id?.[0] || 
                          err.response?.data?.detail || 
                          err.response?.data?.error ||
                          'Failed to start session';
      setError(errorMessage);
      console.error('Error starting session:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Start New Session</h1>
        <p className="text-gray-600 mt-2">
          Select a class to begin a new attendance session
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleStartSession} className="space-y-6">
        {/* Class Selection */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Select Class
          </h2>
          
          {fetchingClasses ? (
            <div className="text-center py-8 text-gray-500">
              Loading classes...
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No classes available. Please create a class first.
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="input-field"
                required
              >
                <option value="">-- Select a class --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.subject_code || cls.subject_name} 
                    {cls.enrolled_students_count !== undefined && 
                      ` (${cls.enrolled_students_count} students)`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Selected Class Details */}
        {selectedClass && (
          <div className="card bg-blue-50 border-blue-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Class Details
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Class Name:</span>
                <span className="text-gray-900 font-semibold">
                  {selectedClass.name}
                </span>
              </div>
              
              {selectedClass.subject_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Subject:</span>
                  <span className="text-gray-900">
                    {selectedClass.subject_code} - {selectedClass.subject_name}
                  </span>
                </div>
              )}
              
              {selectedClass.teacher_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Teacher:</span>
                  <span className="text-gray-900">
                    {selectedClass.teacher_name}
                  </span>
                </div>
              )}
              
              {selectedClass.room_number && (
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Room:</span>
                  <span className="text-gray-900">
                    {selectedClass.room_number}
                  </span>
                </div>
              )}
              
              {selectedClass.academic_year && (
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Academic Year:</span>
                  <span className="text-gray-900">
                    {selectedClass.academic_year}
                  </span>
                </div>
              )}
              
              {selectedClass.semester && (
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Semester:</span>
                  <span className="text-gray-900">
                    {selectedClass.semester}
                  </span>
                </div>
              )}
              
              {selectedClass.enrolled_students_count !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Enrolled Students:</span>
                  <span className="text-gray-900 font-semibold">
                    {selectedClass.enrolled_students_count}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || !selectedClassId || fetchingClasses}
            className="btn-primary flex-1 text-lg py-3"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting Session...
              </span>
            ) : (
              'Start Session'
            )}
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-secondary px-6"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Instructions</h3>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Select the class you want to start a session for</li>
          <li>Review the class details to ensure it's correct</li>
          <li>Click "Start Session" to begin tracking attendance</li>
          <li>Only one active session per class is allowed</li>
          <li>You can only start sessions for classes you teach</li>
        </ul>
      </div>
    </div>
  );
}
