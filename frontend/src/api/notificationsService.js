import api from './axios';

const notificationsService = {
  /**
   * Trigger weekly attendance reports
   * @param {boolean} sendToAll - Send to all students or specific ones
   * @param {string[]} studentEmails - Array of student emails (if sendToAll=false)
   * @returns {Promise} Response with message, count, and notification_ids
   */
  async triggerWeeklyReports(sendToAll = true, studentEmails = []) {
    const response = await api.post('/notifications/trigger-weekly-report/', {
      send_to_all: sendToAll,
      student_emails: studentEmails
    });
    return response.data;
  },

  /**
   * Trigger low attendance alerts
   * @param {number} threshold - Attendance threshold percentage (0-100)
   * @returns {Promise} Response with message, count, notification_ids, and students_alerted
   */
  async triggerLowAttendanceAlerts(threshold = 75.0) {
    const response = await api.post('/notifications/trigger-low-attendance-alert/', {
      threshold
    });
    return response.data;
  },

  /**
   * List notifications with optional filters
   * @param {Object} filters - Optional filters (notification_type, status, recipient_email)
   * @returns {Promise} Array of notifications
   */
  async listNotifications(filters = {}) {
    const params = new URLSearchParams();
    if (filters.notification_type) params.append('notification_type', filters.notification_type);
    if (filters.status) params.append('status', filters.status);
    if (filters.recipient_email) params.append('recipient_email', filters.recipient_email);
    
    const queryString = params.toString();
    const response = await api.get(`/notifications/${queryString ? '?' + queryString : ''}`);
    return response.data;
  },

  /**
   * Get notification detail
   * @param {string} notificationId - UUID of the notification
   * @returns {Promise} Notification detail object
   */
  async getNotificationDetail(notificationId) {
    const response = await api.get(`/notifications/${notificationId}/`);
    return response.data;
  }
};

export default notificationsService;
