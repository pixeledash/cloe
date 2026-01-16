/**
 * ActiveSessions Page
 * View and manage all currently active class sessions
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionService } from '../api/sessionService';
import { classService, subjectService } from '../api/academicService';

export default function ActiveSessions() {
  const navigate = useNavigate();
  const refreshIntervalRef = useRef(null);
  
  // State
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Filters
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  
  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

  // Fetch data on mount and set up auto-refresh
  useEffect(() => {
    fetchData();
    fetchFilters();
    
    // Set up auto-refresh
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchData(true); // Silent refresh
      }, AUTO_REFRESH_INTERVAL);
    }
    
    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  // Re-fetch when filters change
  useEffect(() => {
    fetchData();
  }, [filterClassId, filterSubjectId]);

  const fetchFilters = async () => {
    try {
      const [classesData, subjectsData] = await Promise.all([
        classService.getAll(),
        subjectService.getAll()
      ]);
      setClasses(classesData);
      setSubjects(subjectsData);
    } catch (err) {
      console.error('Error fetching filters:', err);
    }
  };

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const filters = {};
      if (filterClassId) filters.class_id = filterClassId;
      if (filterSubjectId) filters.subject_id = filterSubjectId;
      
      const data = await sessionService.getActive(filters);
      setSessions(data.sessions || []);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load active sessions');
      console.error('Error fetching sessions:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleEndSession = async (sessionId, className) => {
    if (!confirm(`Are you sure you want to end the session for "${className}"?`)) {
      return;
    }

    try {
      const response = await sessionService.end(sessionId);
      setSuccess(response.message || 'Session ended successfully!');
      
      // Refresh the list
      await fetchData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.error ||
                          'Failed to end session';
      setError(errorMessage);
      console.error('Error ending session:', err);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(''), 5000);
    }
  };

  const clearFilters = () => {
    setFilterClassId('');
    setFilterSubjectId('');
  };

  const formatDuration = (startTime) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    
    const now = new Date();
    const diffSeconds = Math.floor((now - lastUpdated) / 1000);
    
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    
    const diffMinutes = Math.floor(diffSeconds / 60);
    return `${diffMinutes}m ago`;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            Active Sessions
            {sessions.length > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {sessions.length} Active
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-2">
            View and manage all currently active class sessions
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/start-session')}
            className="btn-primary"
          >
            + Start New Session
          </button>
          
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="btn-secondary"
            title="Refresh"
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
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
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-900 hover:text-green-700">
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Class
            </label>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="input-field"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Subject
            </label>
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="input-field"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} - {subject.name}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={clearFilters}
            className="btn-secondary"
            disabled={!filterClassId && !filterSubjectId}
          >
            Clear Filters
          </button>
          
          <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm text-gray-700 whitespace-nowrap">
              Auto-refresh
            </label>
          </div>
        </div>
        
        {lastUpdated && (
          <div className="mt-3 text-sm text-gray-500">
            Last updated: {formatLastUpdated()}
          </div>
        )}
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading active sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4 text-purple-600">
            <i className="fi fi-sr-time-forward"></i>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Active Sessions
          </h3>
          <p className="text-gray-600 mb-6">
            There are no active sessions at the moment. Start a new session to begin tracking attendance.
          </p>
          <button
            onClick={() => navigate('/start-session')}
            className="btn-primary"
          >
            Start New Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onEndSession={handleEndSession}
              formatDuration={formatDuration}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Session Card Component
function SessionCard({ session, onEndSession, formatDuration, formatTime }) {
  const [currentDuration, setCurrentDuration] = useState(formatDuration(session.start_time));

  // Update duration every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDuration(formatDuration(session.start_time));
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [session.start_time]);

  return (
    <div className="card bg-white border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {session.class_name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
              ACTIVE
            </span>
            <span className="text-gray-400">•</span>
            <span className="font-medium">{currentDuration}</span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <i className="fi fi-ss-book-alt text-gray-500"></i>
          <span className="font-medium">{session.subject_code}</span>
          <span className="text-gray-400">-</span>
          <span>{session.subject_name}</span>
        </div>
        
        <div className="flex items-center gap-2 text-gray-700">
          <i className="fi fi-ss-user text-gray-500"></i>
          <span>{session.teacher_name}</span>
        </div>
        
        <div className="flex items-center gap-2 text-gray-700">
          <i className="fi fi-ss-clock text-gray-500"></i>
          <span>Started at {formatTime(session.start_time)}</span>
        </div>
        
        {session.class_room && (
          <div className="flex items-center gap-2 text-gray-700">
            <i className="fi fi-ss-room-service text-gray-500"></i>
            <span>Room {session.class_room}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-gray-700">
          <i className="fi fi-ss-users-alt text-gray-500"></i>
          <span>{session.student_count} student{session.student_count !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={() => onEndSession(session.id, session.class_name)}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          End Session
        </button>
      </div>
    </div>
  );
}
