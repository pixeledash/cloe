/**
 * MarkAttendance Page
 * Mark student attendance for active class sessions
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceService } from '../api/attendanceService';
import { sessionService } from '../api/sessionService';

export default function MarkAttendance() {
  const navigate = useNavigate();
  
  // State
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingStudentId, setSavingStudentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [lastSaved, setLastSaved] = useState(null);

  // Fetch active sessions on mount
  useEffect(() => {
    fetchActiveSessions();
  }, []);

  // Fetch attendance when session is selected
  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionAttendance();
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(fetchSessionAttendance, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedSessionId]);

  const fetchActiveSessions = async () => {
    try {
      setLoadingSessions(true);
      const data = await sessionService.getActive();
      setActiveSessions(data.sessions || []);
      
      // Auto-select first session if only one exists
      if (data.sessions && data.sessions.length === 1) {
        setSelectedSessionId(data.sessions[0].id);
      }
    } catch (err) {
      setError('Failed to load active sessions');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchSessionAttendance = async () => {
    if (!selectedSessionId) return;
    
    try {
      setLoading(true);
      const data = await attendanceService.getSessionAttendance(selectedSessionId);
      
      setSessionData(data.session);
      setStatistics(data.statistics);
      setAttendanceRecords(data.records || []);
      
      // Fetch enrolled students from the class
      if (data.session && data.session.class_id) {
        await fetchEnrolledStudents(data.session.class_id);
      }
      
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load attendance data');
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledStudents = async (classId) => {
    try {
      // Import api from axios to fetch students
      const { default: api } = await import('../api/axios');
      const response = await api.get(`/classes/classes/${classId}/students/`);
      setEnrolledStudents(response.data || []);
    } catch (err) {
      console.error('Error fetching enrolled students:', err);
      // Don't set error - this is a secondary operation
    }
  };

  const handleMarkAttendance = async (studentId, status) => {
    setSavingStudentId(studentId);
    setError('');
    
    try {
      await attendanceService.markAttendance(selectedSessionId, studentId, status);
      
      // Update local state immediately (optimistic update)
      setAttendanceRecords(prev => {
        const existing = prev.find(r => r.student_uuid === studentId);
        if (existing) {
          return prev.map(r => 
            r.student_uuid === studentId 
              ? { ...r, status, marked_at: new Date().toISOString() }
              : r
          );
        } else {
          // Add new attendance record
          return [...prev, {
            student_uuid: studentId,
            status,
            marked_at: new Date().toISOString()
          }];
        }
      });
      
      // Refresh to get updated statistics
      await fetchSessionAttendance();
      
      // Show success feedback
      setLastSaved(new Date());
      setSuccess('Attendance saved!');
      setTimeout(() => setSuccess(''), 2000);
      
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.error ||
                          err.response?.data?.student_id?.[0] ||
                          'Failed to mark attendance';
      setError(errorMessage);
      console.error('Error marking attendance:', err);
    } finally {
      setSavingStudentId(null);
    }
  };

  const getStudentAttendanceStatus = (studentId) => {
    const record = attendanceRecords.find(r => r.student_uuid === studentId);
    return record?.status || null;
  };

  const getEnrolledStudents = () => {
    if (!enrolledStudents.length) return [];
    
    // Merge enrolled students with attendance records
    return enrolledStudents.map(student => {
      const attendanceRecord = attendanceRecords.find(
        r => r.student_uuid === student.id
      );
      
      return {
        id: student.id,  // UUID for API calls
        student_id: student.student_id,  // String ID for display
        student_name: student.full_name || `${student.first_name} ${student.last_name}`,
        student_email: student.email,
        status: attendanceRecord?.status || null,
        marked_at: attendanceRecord?.marked_at || null,
        notes: attendanceRecord?.notes || '',
        ...student
      };
    });
  };

  const filteredStudents = getEnrolledStudents().filter(student => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesId = student.student_id?.toLowerCase().includes(query);
      const matchesName = student.student_name?.toLowerCase().includes(query);
      const matchesEmail = student.student_email?.toLowerCase().includes(query);
      if (!matchesId && !matchesName && !matchesEmail) return false;
    }
    
    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'NOT_MARKED' && student.status) return false;
      if (statusFilter !== 'NOT_MARKED' && student.status !== statusFilter) return false;
    }
    
    return true;
  });

  const formatTimeSince = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mark Attendance</h1>
          <p className="text-gray-600 mt-2">
            Record student attendance for active class sessions
          </p>
        </div>
        
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-900 hover:text-red-700">
            ✕
          </button>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
          <i className="fi fi-ss-check-circle text-green-600"></i>
          <span>{success}</span>
        </div>
      )}

      {/* Session Selector */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Select Active Session
        </h2>
        
        {loadingSessions ? (
          <div className="text-center py-4 text-gray-500">Loading sessions...</div>
        ) : activeSessions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3 text-purple-600">
              <i className="fi fi-sr-time-forward"></i>
            </div>
            <p className="text-gray-600 mb-4">No active sessions found</p>
            <button
              onClick={() => navigate('/start-session')}
              className="btn-primary"
            >
              Start a Session
            </button>
          </div>
        ) : (
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Active Session
              </label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="input-field"
              >
                <option value="">-- Select a session --</option>
                {activeSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.class_name} - {session.subject_code} ({session.student_count} students)
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={fetchSessionAttendance}
              disabled={!selectedSessionId || loading}
              className="btn-secondary"
              title="Refresh"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Session Details & Attendance */}
      {selectedSessionId && sessionData && (
        <>
          {/* Session Info Card */}
          <div className="card mb-6 bg-blue-50 border-blue-200">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {sessionData.class_name}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Subject:</span>
                    <p className="font-medium">{sessionData.subject_code} - {sessionData.subject_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Teacher:</span>
                    <p className="font-medium">{sessionData.teacher_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Started:</span>
                    <p className="font-medium">{new Date(sessionData.start_time).toLocaleTimeString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <p className="font-medium">{sessionData.duration}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Dashboard */}
          {statistics && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <div className="card text-center bg-gray-50">
                <div className="text-2xl font-bold text-gray-900">{statistics.total_enrolled}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
              <div className="card text-center bg-green-50">
                <div className="text-2xl font-bold text-green-700">{statistics.present}</div>
                <div className="text-sm text-gray-600">Present</div>
              </div>
              <div className="card text-center bg-red-50">
                <div className="text-2xl font-bold text-red-700">{statistics.absent}</div>
                <div className="text-sm text-gray-600">Absent</div>
              </div>
              <div className="card text-center bg-yellow-50">
                <div className="text-2xl font-bold text-yellow-700">{statistics.late}</div>
                <div className="text-sm text-gray-600">Late</div>
              </div>
              <div className="card text-center bg-gray-50">
                <div className="text-2xl font-bold text-gray-700">{statistics.not_marked}</div>
                <div className="text-sm text-gray-600">Not Marked</div>
              </div>
              <div className="card text-center bg-blue-50">
                <div className="text-2xl font-bold text-blue-700">{statistics.attendance_rate}%</div>
                <div className="text-sm text-gray-600">Attendance Rate</div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="card mb-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search students by name, ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="ALL">All Students</option>
                  <option value="PRESENT">Present Only</option>
                  <option value="ABSENT">Absent Only</option>
                  <option value="LATE">Late Only</option>
                  <option value="NOT_MARKED">Not Marked</option>
                </select>
              </div>
            </div>
          </div>

          {/* Student List */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Students ({filteredStudents.length})
              </h2>
              {lastSaved && (
                <span className="text-sm text-gray-500">
                  Last saved: {formatTimeSince(lastSaved)}
                </span>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No students found {searchQuery || statusFilter !== 'ALL' ? 'matching your filters' : ''}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map((student) => {
                  const currentStatus = getStudentAttendanceStatus(student.id);
                  const isSaving = savingStudentId === student.id;
                  
                  return (
                    <StudentAttendanceRow
                      key={student.id}
                      student={student}
                      currentStatus={currentStatus}
                      onStatusChange={(status) => handleMarkAttendance(student.id, status)}
                      isSaving={isSaving}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Student Attendance Row Component
function StudentAttendanceRow({ student, currentStatus, onStatusChange, isSaving }) {
  const statuses = [
    { value: 'PRESENT', label: 'Present', icon: 'fi fi-ss-check', color: 'green' },
    { value: 'ABSENT', label: 'Absent', icon: 'fi fi-ss-cross', color: 'red' },
    { value: 'LATE', label: 'Late', icon: 'fi fi-ss-clock', color: 'yellow' },
  ];

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      {/* Student Info */}
      <div className="flex-1">
        <div className="font-medium text-gray-900">
          {student.student_name || 'Unknown Student'}
        </div>
        <div className="text-sm text-gray-600">
          {student.student_id} • {student.student_email}
        </div>
      </div>

      {/* Status Buttons */}
      <div className="flex gap-2">
        {statuses.map((status) => {
          const isSelected = currentStatus === status.value;
          const bgColor = isSelected 
            ? `bg-${status.color}-100 border-${status.color}-500`
            : 'bg-white border-gray-300';
          const textColor = isSelected 
            ? `text-${status.color}-700`
            : 'text-gray-600';
          
          return (
            <button
              key={status.value}
              onClick={() => onStatusChange(status.value)}
              disabled={isSaving}
              className={`
                px-4 py-2 border-2 rounded-lg font-medium transition-all
                ${bgColor} ${textColor}
                hover:shadow-md hover:scale-105
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isSelected ? 'ring-2 ring-offset-2 ring-' + status.color + '-500' : ''}
              `}
              title={status.label}
            >
              <i className={`${status.icon} text-lg mr-1`}></i>
              {status.label}
            </button>
          );
        })}
      </div>

      {/* Saving Indicator */}
      {isSaving && (
        <div className="ml-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
