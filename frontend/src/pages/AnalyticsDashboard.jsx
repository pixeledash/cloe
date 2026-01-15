/**
 * AnalyticsDashboard Page
 * Integrated analytics and report generation
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api from '../api/axios';
import reportsService from '../api/reportsService';

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data state
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Analytics state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // Report generation state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState('student');
  const [reportStudentId, setReportStudentId] = useState('');
  const [reportClassId, setReportClassId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    fetchData();
    setDefaultDates();
  }, []);

  const setDefaultDates = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [studentsRes, classesRes, reportsRes] = await Promise.all([
        api.get('/classes/students/').catch(() => ({ data: [] })),
        api.get('/classes/classes/').catch(() => ({ data: [] })),
        reportsService.listReports().catch(() => [])
      ]);

      setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : studentsRes.data.results || []);
      setClasses(Array.isArray(classesRes.data) ? classesRes.data : classesRes.data.results || []);
      setReports(Array.isArray(reportsRes) ? reportsRes : []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudentAnalytics = () => {
    if (selectedStudentId) {
      navigate(`/analytics/student/${selectedStudentId}`);
    }
  };

  const handleViewClassAnalytics = () => {
    if (selectedClassId) {
      navigate(`/analytics/class/${selectedClassId}`);
    }
  };

  const handleGenerateReport = async () => {
    setReportError(null);

    // Validation
    if (reportType === 'student' && !reportStudentId) {
      setReportError('Please select a student');
      return;
    }
    if (reportType === 'class' && !reportClassId) {
      setReportError('Please select a class');
      return;
    }
    if (!startDate || !endDate) {
      setReportError('Please select date range');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setReportError('Start date must be before or equal to end date');
      return;
    }

    try {
      setGeneratingReport(true);

      const reportData = {
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
        format: 'csv',
      };

      if (reportType === 'student') {
        reportData.student_id = reportStudentId;
      } else {
        reportData.class_id = reportClassId;
      }

      const report = await reportsService.generateReport(reportData);
      
      // Refresh reports list
      const reportsRes = await reportsService.listReports();
      setReports(Array.isArray(reportsRes) ? reportsRes : []);
      
      // Auto-download the generated report
      if (report.status === 'COMPLETED') {
        await handleDownload(report);
      }
      
      // Reset form and close
      setShowReportForm(false);
      setReportType('student');
      setReportStudentId('');
      setReportClassId('');
      setDefaultDates();
      
    } catch (err) {
      console.error('Error generating report:', err);
      setReportError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownload = async (report) => {
    if (report.status !== 'COMPLETED') {
      setReportError('Only completed reports can be downloaded');
      return;
    }

    try {
      setDownloadingId(report.id);
      setReportError(null);

      const response = await reportsService.downloadReport(report.id);
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'report.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      } else {
        const target = report.student_name || report.class_name || 'unknown';
        filename = `${report.report_type.toLowerCase()}_report_${target.replace(/\s+/g, '_')}_${report.start_date}_to_${report.end_date}.csv`;
      }

      reportsService.triggerDownload(response.data, filename);
    } catch (err) {
      console.error('Error downloading report:', err);
      setReportError('Failed to download report');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      COMPLETED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    const icons = {
      COMPLETED: '✓',
      PENDING: '⏳',
      FAILED: '✗',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {icons[status]} {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const isStudentRole = user?.roles?.includes('STUDENT');
  const canGenerateClassReports = user?.roles?.includes('ADMIN') || user?.roles?.includes('TEACHER');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Reports</h1>
          <p className="text-gray-600">View insights, generate reports, and track attendance performance</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary">
          ← Back to Dashboard
        </button>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Student Analytics Card */}
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="text-4xl mb-3">👤</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Student Analytics</h3>
          <p className="text-gray-600 mb-4">View detailed attendance analytics for individual students</p>
          
          {loading ? (
            <div className="text-sm text-gray-500">Loading students...</div>
          ) : students.length > 0 ? (
            <div className="space-y-3">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="input-field"
              >
                <option value="">-- Select a student --</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name || `${student.first_name} ${student.last_name}`} ({student.student_id})
                  </option>
                ))}
              </select>
              <button
                onClick={handleViewStudentAnalytics}
                disabled={!selectedStudentId}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View Analytics
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No students available</p>
          )}
        </div>

        {/* Class Analytics Card */}
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="text-4xl mb-3">📚</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Class Analytics</h3>
          <p className="text-gray-600 mb-4">View performance metrics and trends for entire classes</p>
          
          {loading ? (
            <div className="text-sm text-gray-500">Loading classes...</div>
          ) : classes.length > 0 ? (
            <div className="space-y-3">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="input-field"
              >
                <option value="">-- Select a class --</option>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} - {classItem.subject_name || 'N/A'}
                  </option>
                ))}
              </select>
              <button
                onClick={handleViewClassAnalytics}
                disabled={!selectedClassId}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View Analytics
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No classes available</p>
          )}
        </div>
      </div>

      {/* Report Generation Section */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Generate Reports</h2>
            <p className="text-gray-600 text-sm">Create custom attendance reports with date ranges</p>
          </div>
          <button
            onClick={() => setShowReportForm(!showReportForm)}
            className="btn-primary"
          >
            {showReportForm ? 'Hide Form' : '+ New Report'}
          </button>
        </div>

        {/* Report Generation Form */}
        {showReportForm && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Report Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReportType('student')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                      reportType === 'student'
                        ? 'border-purple-600 bg-purple-50 text-purple-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    👤 Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportType('class')}
                    disabled={!canGenerateClassReports}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                      !canGenerateClassReports
                        ? 'opacity-50 cursor-not-allowed bg-gray-100'
                        : reportType === 'class'
                        ? 'border-purple-600 bg-purple-50 text-purple-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    📚 Class
                  </button>
                </div>
              </div>

              {/* Target Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {reportType === 'student' ? 'Select Student' : 'Select Class'}
                </label>
                {reportType === 'student' ? (
                  <select
                    value={reportStudentId}
                    onChange={(e) => setReportStudentId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">-- Select a student --</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name || `${student.first_name} ${student.last_name}`} ({student.student_id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={reportClassId}
                    onChange={(e) => setReportClassId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">-- Select a class --</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name} - {classItem.subject_name || 'N/A'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || new Date().toISOString().split('T')[0]}
                  className="input-field"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="input-field"
                />
              </div>
            </div>

            {/* Error Message */}
            {reportError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {reportError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingReport ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Generating...
                  </>
                ) : (
                  <>📊 Generate & Download</>
                )}
              </button>
              <button
                onClick={() => {
                  setShowReportForm(false);
                  setReportError(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Recent Reports List */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Recent Reports</h3>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>No reports generated yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.slice(0, 5).map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{report.report_type === 'STUDENT' ? '👤' : '📚'}</span>
                      <div>
                        <div className="font-medium text-gray-900">
                          {report.student_name || report.class_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(report.start_date)} - {formatDate(report.end_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(report.status)}
                    {report.status === 'COMPLETED' && (
                      <button
                        onClick={() => handleDownload(report)}
                        disabled={downloadingId === report.id}
                        className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                      >
                        {downloadingId === report.id ? (
                          <span className="inline-block animate-spin">⏳</span>
                        ) : (
                          '⬇️ Download'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
