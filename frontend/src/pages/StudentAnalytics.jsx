/**
 * StudentAnalytics Page
 * Comprehensive analytics view for individual students
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analyticsService } from '../api/analyticsService';
import reportsService from '../api/reportsService';
import StatCard from '../components/StatCard';
import RiskBadge from '../components/RiskBadge';
import TrendIndicator from '../components/TrendIndicator';
import AttendanceRateGauge from '../components/AttendanceRateGauge';

export default function StudentAnalytics() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportingReport, setExportingReport] = useState(false);

  useEffect(() => {
    if (studentId) {
      fetchAnalytics();
    }
  }, [studentId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await analyticsService.getStudentAnalytics(studentId);
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

  const exportToCSV = async () => {
    if (!analytics) return;

    try {
      setExportingReport(true);
      await reportsService.generateAndDownloadStudentReport(
        studentId,
        analytics.student_name
      );
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setExportingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
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
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="card text-center py-12">
          <div className="text-6xl mb-4 text-purple-600">
            <i className="fi fi-ss-chart-histogram"></i>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-600 mb-4">No data available for this student.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Analytics</h1>
          <p className="text-gray-600">Comprehensive attendance insights and trends</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToCSV} 
            className="btn-secondary"
            disabled={exportingReport}
          >
            {exportingReport ? (
              <>
                <svg className="animate-spin h-5 w-5 inline-block mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <i className="fi fi-ss-download"></i> Export CSV
              </>
            )}
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary">
            <i className="fi fi-ss-arrow-left"></i> Back
          </button>
        </div>
      </div>

      {/* Student Info Card */}
      <div className="card mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
              {analytics.student_name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{analytics.student_name}</h2>
              <p className="text-gray-600">{analytics.student_email}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <RiskBadge level={analytics.risk_level} size="lg" />
            <TrendIndicator trend={analytics.recent_trend} />
          </div>
        </div>
      </div>

      {/* Overview Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Sessions"
          value={analytics.total_sessions}
          icon="fi fi-ss-books"
          color="blue"
        />
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 flex items-center justify-center">
          <AttendanceRateGauge rate={analytics.attendance_rate} size="lg" />
        </div>
        <StatCard
          title="Punctuality Rate"
          value={`${analytics.punctuality_rate}%`}
          icon="fi fi-ss-clock"
          color="purple"
          subtitle="On-time arrivals"
        />
        <StatCard
          title="Consecutive Absences"
          value={analytics.consecutive_absences}
          icon="fi fi-ss-exclamation"
          color={analytics.consecutive_absences >= 3 ? 'red' : analytics.consecutive_absences >= 2 ? 'yellow' : 'green'}
          subtitle="Current streak"
        />
      </div>

      {/* Detailed Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Present"
          value={analytics.present_count}
          icon="fi fi-ss-check"
          color="green"
          subtitle={`${analytics.attendance_rate.toFixed(1)}% of sessions`}
        />
        <StatCard
          title="Absent"
          value={analytics.absent_count}
          icon="fi fi-ss-cross"
          color="red"
          subtitle={`${analytics.absence_rate.toFixed(1)}% of sessions`}
        />
        <StatCard
          title="Late"
          value={analytics.late_count}
          icon="⌚"
          color="yellow"
          subtitle={`${analytics.late_rate.toFixed(1)}% of sessions`}
        />
      </div>

      {/* Risk Assessment Panel */}
      {analytics.risk_level !== 'low' && (
        <div className={`card mb-6 ${
          analytics.risk_level === 'high' 
            ? 'bg-red-50 border-red-300' 
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className={`text-xl font-bold mb-2 ${
                analytics.risk_level === 'high' ? 'text-red-900' : 'text-yellow-900'
              }`}>
                {analytics.risk_level === 'high' ? 'High Risk - Intervention Needed' : 'Medium Risk - Monitor Closely'}
              </h3>
              <div className={`mb-3 ${
                analytics.risk_level === 'high' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analytics.attendance_rate < 70 && (
                    <li>Attendance rate below 70% ({analytics.attendance_rate.toFixed(1)}%)</li>
                  )}
                  {analytics.attendance_rate >= 70 && analytics.attendance_rate < 85 && (
                    <li>Attendance rate between 70-85% ({analytics.attendance_rate.toFixed(1)}%)</li>
                  )}
                  {analytics.consecutive_absences >= 3 && (
                    <li>{analytics.consecutive_absences} consecutive absences</li>
                  )}
                  {analytics.consecutive_absences === 2 && (
                    <li>2 consecutive absences</li>
                  )}
                  {analytics.late_rate > 20 && (
                    <li>Late rate above 20% ({analytics.late_rate.toFixed(1)}%)</li>
                  )}
                </ul>
              </div>
              <div className={analytics.risk_level === 'high' ? 'text-red-800' : 'text-yellow-800'}>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Class Breakdown Table */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Class Breakdown</h3>
          <span className="text-sm text-gray-600">
            {analytics.classes_enrolled.length} {analytics.classes_enrolled.length === 1 ? 'class' : 'classes'}
          </span>
        </div>

        {analytics.classes_enrolled.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No class enrollments found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.classes_enrolled.map((classInfo, index) => {
                  const rate = classInfo.attendance_rate;
                  const rateColor = rate >= 85 ? 'text-green-700' : rate >= 70 ? 'text-yellow-700' : 'text-red-700';
                  const rateBg = rate >= 85 ? 'bg-green-50' : rate >= 70 ? 'bg-yellow-50' : 'bg-red-50';
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {classInfo.class_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {classInfo.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {classInfo.teacher}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {classInfo.sessions_in_class}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${rateBg} ${rateColor}`}>
                          {classInfo.attendance_rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Card */}
      {analytics.risk_level === 'low' && analytics.attendance_rate >= 85 && (
        <div className="card bg-green-50 border-green-300 text-center">
          <div className="text-5xl mb-3">🌟</div>
          <h3 className="text-xl font-bold text-green-900 mb-2">Excellent Attendance!</h3>
          <p className="text-green-700">
            This student maintains a strong attendance record with a {analytics.attendance_rate.toFixed(1)}% attendance rate.
            Keep up the great work!
          </p>
        </div>
      )}
    </div>
  );
}
