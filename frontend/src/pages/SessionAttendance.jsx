/**
 * SessionAttendance Page
 * View and analyze attendance for any session (active or ended)
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { attendanceService } from '../api/attendanceService';
import { sessionService } from '../api/sessionService';

export default function SessionAttendance() {
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams();
  
  // State
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(urlSessionId || '');
  const [sessionData, setSessionData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name'); // name, status, time

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Fetch attendance when session is selected
  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionAttendance();
    }
  }, [selectedSessionId]);

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      
      // Fetch both active and recent ended sessions
      const [activeData, allData] = await Promise.all([
        sessionService.getActive(),
        sessionService.getAll({ ordering: '-start_time' })
      ]);
      
      // Combine and deduplicate
      const allSessions = [
        ...(activeData.sessions || []),
        ...(allData.sessions || []).slice(0, 20) // Last 20 sessions
      ];
      
      // Remove duplicates by id
      const uniqueSessions = Array.from(
        new Map(allSessions.map(s => [s.id, s])).values()
      );
      
      setSessions(uniqueSessions);
    } catch (err) {
      setError('Failed to load sessions');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchSessionAttendance = async () => {
    if (!selectedSessionId) return;
    
    try {
      setLoading(true);
      setError('');
      const data = await attendanceService.getSessionAttendance(selectedSessionId);
      
      setSessionData(data.session);
      setStatistics(data.statistics);
      setAttendanceRecords(data.records || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load attendance data');
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!attendanceRecords.length) return;
    
    // Helper function to properly escape CSV fields
    const escapeCSVField = (field) => {
      if (field === null || field === undefined) return '';
      const stringField = String(field);
      // Wrap in quotes and escape existing quotes
      return `"${stringField.replace(/"/g, '""')}"`;
    };
    
    // Create CSV content
    const headers = ['Student ID', 'Student Name', 'Email', 'Status', 'Marked At', 'Notes'];
    const rows = attendanceRecords.map(record => [
      escapeCSVField(record.student_id),
      escapeCSVField(record.student_name || 'N/A'),
      escapeCSVField(record.student_email || 'N/A'),
      escapeCSVField(record.status),
      escapeCSVField(record.marked_at ? new Date(record.marked_at).toLocaleString() : 'Not marked'),
      escapeCSVField(record.notes || '')
    ]);
    
    const csvRows = [
      headers.map(escapeCSVField).join(','),
      ...rows.map(row => row.join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${sessionData.class_name}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredAndSortedRecords = attendanceRecords
    .filter(record => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = record.student_id?.toLowerCase().includes(query);
        const matchesName = record.student_name?.toLowerCase().includes(query);
        const matchesEmail = record.student_email?.toLowerCase().includes(query);
        if (!matchesId && !matchesName && !matchesEmail) return false;
      }
      
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'NOT_MARKED' && record.status) return false;
        if (statusFilter !== 'NOT_MARKED' && record.status !== statusFilter) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return (a.student_name || '').localeCompare(b.student_name || '');
      } else if (sortBy === 'status') {
        return (a.status || 'ZZZ').localeCompare(b.status || 'ZZZ');
      } else if (sortBy === 'time') {
        return new Date(b.marked_at || 0) - new Date(a.marked_at || 0);
      }
      return 0;
    });

  const getStatusBadge = (status) => {
    const config = {
      PRESENT: { bg: 'bg-green-100', text: 'text-green-800', icon: 'fi fi-ss-check' },
      ABSENT: { bg: 'bg-red-100', text: 'text-red-800', icon: 'fi fi-ss-cross' },
      LATE: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'fi fi-ss-clock' },
    };
    
    const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: 'fi fi-ss-interrogation' };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${c.bg} ${c.text}`}>
        <i className={`${c.icon} mr-1`}></i>
        {status || 'Not Marked'}
      </span>
    );
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not marked';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Session Attendance</h1>
          <p className="text-gray-600 mt-2">
            View and analyze attendance records for class sessions
          </p>
        </div>
        
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-900 hover:text-red-700">
            ✕
          </button>
        </div>
      )}

      {/* Session Selector */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Select Session
        </h2>
        
        {loadingSessions ? (
          <div className="text-center py-4 text-gray-500">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3 text-purple-600">
              <i className="fi fi-ss-books"></i>
            </div>
            <p className="text-gray-600">No sessions found</p>
          </div>
        ) : (
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session
              </label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="input-field"
              >
                <option value="">-- Select a session --</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.class_name} - {session.subject_code} 
                    ({new Date(session.start_time).toLocaleDateString()})
                    {session.is_active ? ' - Active' : ' - Ended'}
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
          <div className="card mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {sessionData.class_name}
                  </h3>
                  {sessionData.is_active ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                      ● Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
                      Ended
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mt-4">
                  <div>
                    <span className="text-gray-600">Subject:</span>
                    <p className="font-medium">{sessionData.subject_code}</p>
                    <p className="text-xs text-gray-500">{sessionData.subject_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Teacher:</span>
                    <p className="font-medium">{sessionData.teacher_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Started:</span>
                    <p className="font-medium">
                      {new Date(sessionData.start_time).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(sessionData.start_time).toLocaleTimeString()}
                    </p>
                  </div>
                  {sessionData.end_time && (
                    <div>
                      <span className="text-gray-600">Ended:</span>
                      <p className="font-medium">
                        {new Date(sessionData.end_time).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(sessionData.end_time).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
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
                <div className="text-3xl font-bold text-gray-900">{statistics.total_enrolled}</div>
                <div className="text-sm text-gray-600 mt-1">Total Students</div>
              </div>
              <div className="card text-center bg-green-50 border-green-200">
                <div className="text-3xl font-bold text-green-700">{statistics.present}</div>
                <div className="text-sm text-gray-600 mt-1">Present</div>
              </div>
              <div className="card text-center bg-red-50 border-red-200">
                <div className="text-3xl font-bold text-red-700">{statistics.absent}</div>
                <div className="text-sm text-gray-600 mt-1">Absent</div>
              </div>
              <div className="card text-center bg-yellow-50 border-yellow-200">
                <div className="text-3xl font-bold text-yellow-700">{statistics.late}</div>
                <div className="text-sm text-gray-600 mt-1">Late</div>
              </div>
              <div className="card text-center bg-gray-50">
                <div className="text-3xl font-bold text-gray-700">{statistics.not_marked}</div>
                <div className="text-sm text-gray-600 mt-1">Not Marked</div>
              </div>
              <div className="card text-center bg-blue-50 border-blue-200">
                <div className="text-3xl font-bold text-blue-700">{statistics.attendance_rate}%</div>
                <div className="text-sm text-gray-600 mt-1">Attendance</div>
              </div>
            </div>
          )}

          {/* Search, Filters, and Actions */}
          <div className="card mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[300px]">
                <input
                  type="text"
                  placeholder="Search students..."
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
                  <option value="ALL">All Status</option>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                  <option value="NOT_MARKED">Not Marked</option>
                </select>
              </div>
              
              <div className="w-48">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field"
                >
                  <option value="name">Sort by Name</option>
                  <option value="status">Sort by Status</option>
                  <option value="time">Sort by Time</option>
                </select>
              </div>
              
              <button
                onClick={handleExport}
                disabled={!attendanceRecords.length}
                className="btn-secondary whitespace-nowrap"
              >
                <i className="fi fi-ss-download"></i> Export CSV
              </button>
            </div>
          </div>

          {/* Attendance Records Table */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Attendance Records ({filteredAndSortedRecords.length})
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading attendance data...</p>
              </div>
            ) : filteredAndSortedRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No attendance records found {searchQuery || statusFilter !== 'ALL' ? 'matching your filters' : ''}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Marked At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedRecords.map((record, index) => (
                      <tr key={record.id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {record.student_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {record.student_id} • {record.student_email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(record.marked_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {record.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {sessionData.is_active && (
            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={() => navigate('/mark-attendance')}
                className="btn-primary"
              >
                Mark Attendance for This Session
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
