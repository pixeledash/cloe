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
};

export default reportsService;
