/**
 * Reports API Service
 * Handles report generation, listing, and downloading
 */
import api from './axios';

export const reportsService = {
  /**
   * Generate a new report
   * @param {Object} data - Report parameters
   * @param {string} data.report_type - 'student' or 'class'
   * @param {string} data.student_id - UUID (required for student reports)
   * @param {string} data.class_id - UUID (required for class reports)
   * @param {string} data.start_date - YYYY-MM-DD
   * @param {string} data.end_date - YYYY-MM-DD
   * @param {string} data.format - 'csv' or 'pdf' (default: 'csv')
   * @returns {Promise} Report metadata with download_url
   */
  async generateReport(data) {
    const response = await api.post('/reports/generate/', data);
    return response.data;
  },

  /**
   * List all reports for the current user
   * @returns {Promise} Array of report metadata
   */
  async listReports() {
    const response = await api.get('/reports/');
    return response.data;
  },

  /**
   * Download a generated report
   * @param {string} reportId - UUID of the report
   * @returns {Promise} Blob data for file download
   */
  async downloadReport(reportId) {
    const response = await api.get(`/reports/${reportId}/download/`, {
      responseType: 'blob', // Important for file download
    });
    return response;
  },

  /**
   * Helper: Trigger browser download from blob
   * @param {Blob} blob - File blob data
   * @param {string} filename - Desired filename
   */
  triggerDownload(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Generate and immediately download a student report
   * @param {string} studentId - Student UUID
   * @param {string} studentName - Student name (for filename)
   * @param {string} startDate - Start date (YYYY-MM-DD, optional)
   * @param {string} endDate - End date (YYYY-MM-DD, optional)
   */
  async generateAndDownloadStudentReport(studentId, studentName, startDate = null, endDate = null) {
    try {
      // Use default date range if not provided (last 30 days to today)
      const end = endDate || new Date().toISOString().split('T')[0];
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Generate report
      const report = await this.generateReport({
        report_type: 'student',
        student_id: studentId,
        start_date: start,
        end_date: end,
        format: 'csv'
      });

      // Download the file
      const response = await this.downloadReport(report.id);
      
      // Trigger download with proper filename
      const filename = `student-report-${studentName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
      this.triggerDownload(response.data, filename);
      
      return report;
    } catch (error) {
      console.error('Error generating student report:', error);
      throw error;
    }
  },

  /**
   * Generate and immediately download a class report
   * @param {string} classId - Class UUID
   * @param {string} className - Class name (for filename)
   * @param {string} startDate - Start date (YYYY-MM-DD, optional)
   * @param {string} endDate - End date (YYYY-MM-DD, optional)
   */
  async generateAndDownloadClassReport(classId, className, startDate = null, endDate = null) {
    try {
      // Use default date range if not provided (last 30 days to today)
      const end = endDate || new Date().toISOString().split('T')[0];
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Generate report
      const report = await this.generateReport({
        report_type: 'class',
        class_id: classId,
        start_date: start,
        end_date: end,
        format: 'csv'
      });

      // Download the file
      const response = await this.downloadReport(report.id);
      
      // Trigger download with proper filename
      const filename = `class-report-${className.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
      this.triggerDownload(response.data, filename);
      
      return report;
    } catch (error) {
      console.error('Error generating class report:', error);
      throw error;
    }
  }
};

export default reportsService;
