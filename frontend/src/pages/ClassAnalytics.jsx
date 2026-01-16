/**
 * ClassAnalytics Page
 * Comprehensive analytics view for class performance
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analyticsService } from '../api/analyticsService';
import StatCard from '../components/StatCard';
import TrendIndicator from '../components/TrendIndicator';
import AttendanceRateGauge from '../components/AttendanceRateGauge';

export default function ClassAnalytics() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('chronic'); // chronic, at-risk, perfect
  const [sortConfig, setSortConfig] = useState({ key: 'attendance_rate', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (classId) {
      fetchAnalytics();
    }
  }, [classId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await analyticsService.getClassAnalytics(classId);
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(
        err.response?.data?.error || 
        err.response?.data?.detail || 
        'Failed to load analytics data'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getSortedStudents = () => {
    if (!analytics?.student_statistics) return [];
    
    let filtered = analytics.student_statistics.filter(student => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        student.student_name.toLowerCase().includes(query) ||
        student.student_email.toLowerCase().includes(query)
      );
    });

    return [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  const exportToCSV = () => {
    if (!analytics) return;

    const csvData = [
      ['Class Analytics Report'],
      [''],
      ['Class Information'],
      ['Class Name', analytics.class_info.class_name],
      ['Subject', analytics.class_info.subject],
      ['Teacher', analytics.class_info.teacher],
      ['Schedule', analytics.class_info.schedule],
      [''],
      ['Overall Statistics'],
      ['Total Students', analytics.total_students],
      ['Total Sessions', analytics.total_sessions],
      ['Overall Attendance Rate', `${analytics.overall_attendance_rate}%`],
      [''],
      ['Student Performance'],
      ['Student Name', 'Email', 'Sessions Attended', 'Present', 'Absent', 'Late', 'Attendance Rate'],
      ...analytics.student_statistics.map(s => [
        s.student_name,
        s.student_email,
        s.sessions_attended,
        s.present,
        s.absent,
        s.late,
        `${s.attendance_rate}%`
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `class-analytics-${analytics.class_info.class_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading class analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Analytics</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <div className="flex gap-3">
                <button onClick={fetchAnalytics} className="btn-secondary">
                  Try Again
                </button>
                <button onClick={() => navigate('/dashboard')} className="btn-secondary">
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const sortedStudents = getSortedStudents();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Class Analytics</h1>
          <p className="text-gray-600">Performance insights and attendance trends</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="btn-secondary">
            📥 Export CSV
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary">
            ← Back
          </button>
        </div>
      </div>

      {/* Class Info Card */}
      <div className="card mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{analytics.class_info.class_name}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Subject:</span>
                <p className="font-medium">{analytics.class_info.subject}</p>
              </div>
              <div>
                <span className="text-gray-600">Teacher:</span>
                <p className="font-medium">{analytics.class_info.teacher}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Schedule:</span>
                <p className="font-medium">{analytics.class_info.schedule}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <AttendanceRateGauge rate={analytics.overall_attendance_rate} size="md" />
            {analytics.trends && (
              <TrendIndicator trend={analytics.trends.trend_direction} />
            )}
          </div>
        </div>
      </div>

      {/* Overview Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Total Students"
          value={analytics.total_students}
          icon="fi fi-ss-users-alt"
          color="blue"
        />
        <StatCard
          title="Sessions Conducted"
          value={analytics.total_sessions}
          icon="fi fi-ss-calendar"
          color="purple"
        />
        <StatCard
          title="Average Attendance"
          value={`${analytics.overall_attendance_rate.toFixed(1)}%`}
          icon="fi fi-ss-chart-histogram"
          color={analytics.overall_attendance_rate >= 85 ? 'green' : analytics.overall_attendance_rate >= 70 ? 'yellow' : 'red'}
        />
      </div>

      {/* Trends Analysis */}
      {analytics.trends && analytics.trends.trend_direction !== 'insufficient_data' && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Attendance Trends</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Recent Average</p>
              <p className="text-2xl font-bold text-blue-700">{analytics.trends.recent_average.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">Last 10 sessions</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Previous Average</p>
              <p className="text-2xl font-bold text-gray-700">{analytics.trends.previous_average.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">Previous 10 sessions</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Change</p>
              <p className={`text-2xl font-bold ${
                analytics.trends.change > 0 ? 'text-green-700' : 
                analytics.trends.change < 0 ? 'text-red-700' : 'text-gray-700'
              }`}>
                {analytics.trends.change > 0 ? '+' : ''}{analytics.trends.change.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">Percentage points</p>
            </div>
          </div>
        </div>
      )}

      {/* Student Performance Table */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Student Performance</h3>
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('student_name')}
                >
                  Student {sortConfig.key === 'student_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('sessions_attended')}
                >
                  Sessions {sortConfig.key === 'sessions_attended' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('present')}
                >
                  Present {sortConfig.key === 'present' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('absent')}
                >
                  Absent {sortConfig.key === 'absent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('late')}
                >
                  Late {sortConfig.key === 'late' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('attendance_rate')}
                >
                  Attendance Rate {sortConfig.key === 'attendance_rate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedStudents.map((student, index) => {
                const rate = student.attendance_rate;
                const rateColor = rate >= 85 ? 'text-green-700' : rate >= 70 ? 'text-yellow-700' : 'text-red-700';
                const rateBg = rate >= 85 ? 'bg-green-50' : rate >= 70 ? 'bg-yellow-50' : 'bg-red-50';
                const rowBg = rate < 70 ? 'bg-red-50' : '';
                
                return (
                  <tr key={index} className={`hover:bg-gray-50 ${rowBg}`}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {student.student_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {student.student_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.sessions_attended}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-medium">
                      {student.present}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 font-medium">
                      {student.absent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-700 font-medium">
                      {student.late}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${rateBg} ${rateColor}`}>
                        {rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedStudents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No students found matching your search
          </div>
        )}
      </div>

      {/* Patterns & Insights Panel */}
      {analytics.patterns && (
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Attendance Patterns</h3>
          
          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('chronic')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'chronic'
                  ? 'border-b-2 border-red-500 text-red-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Chronic Absentees ({analytics.patterns.chronic_absentees?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('at-risk')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'at-risk'
                  ? 'border-b-2 border-yellow-500 text-yellow-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              At-Risk Students ({analytics.patterns.at_risk_students?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('perfect')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'perfect'
                  ? 'border-b-2 border-green-500 text-green-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Perfect Attendance ({analytics.patterns.perfect_attendance?.length || 0})
            </button>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'chronic' && (
              <div>
                {analytics.patterns.chronic_absentees?.length > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-red-700">
                        <strong>⚠️ Action Required:</strong> These students have attendance rates below 70% and need immediate intervention.
                      </p>
                    </div>
                    {analytics.patterns.chronic_absentees.map((student, index) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{student.student_name}</p>
                          <p className="text-sm text-gray-600">{student.total_sessions} sessions • {student.absences} absences</p>
                        </div>
                        <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full font-bold">
                          {student.attendance_rate.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">
                      <i className="fi fi-ss-check text-green-600"></i>
                    </div>
                    <p>No chronic absentees - Great job!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'at-risk' && (
              <div>
                {analytics.patterns.at_risk_students?.length > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-yellow-700">
                        <strong>⚠️ Monitor Closely:</strong> These students have attendance rates between 70-85% and may need support.
                      </p>
                    </div>
                    {analytics.patterns.at_risk_students.map((student, index) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{student.student_name}</p>
                          <p className="text-sm text-gray-600">{student.total_sessions} sessions • {student.absences} absences</p>
                        </div>
                        <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full font-bold">
                          {student.attendance_rate.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">
                      <i className="fi fi-ss-check text-green-600"></i>
                    </div>
                    <p>No at-risk students identified</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'perfect' && (
              <div>
                {analytics.patterns.perfect_attendance?.length > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-green-700">
                        <strong>🌟 Celebrate:</strong> These students have perfect attendance records!
                      </p>
                    </div>
                    {analytics.patterns.perfect_attendance.map((student, index) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{student.student_name}</p>
                          <p className="text-sm text-gray-600">{student.total_sessions} sessions attended</p>
                        </div>
                        <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full font-bold flex items-center gap-2">
                          <i className="fi fi-ss-trophy"></i>
                          {student.attendance_rate.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2 text-purple-600">
                      <i className="fi fi-ss-chart-histogram"></i>
                    </div>
                    <p>No students with perfect attendance yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
