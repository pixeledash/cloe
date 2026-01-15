/**
 * Attendance Service
 * API service layer for attendance management
 */
import api from './axios';

const API_BASE = '/attendance/attendance';

export const attendanceService = {
  /**
   * Mark attendance for a single student
   * @param {string} sessionId - UUID of the session
   * @param {string} studentId - UUID of the student
   * @param {string} status - PRESENT | ABSENT | LATE
   * @param {string} notes - Optional notes
   * @returns {Promise} Response with attendance record
   */
  markAttendance: (sessionId, studentId, status, notes = '') =>
    api.post(`${API_BASE}/mark/`, {
      session_id: sessionId,
      student_id: studentId,
      status,
      notes
    }).then(res => res.data),
  
  /**
   * Mark attendance for multiple students at once
   * @param {string} sessionId - UUID of the session
   * @param {Array} records - Array of {student_id, status, notes?}
   * @returns {Promise} Response with created records
   */
  bulkMark: (sessionId, records) =>
    api.post(`${API_BASE}/bulk-mark/`, {
      session_id: sessionId,
      records
    }).then(res => res.data),
  
  /**
   * Get all attendance records for a session with statistics
   * @param {string} sessionId - UUID of the session
   * @param {Object} filters - Optional filters (status, marked_after)
   * @returns {Promise} Response with session attendance and statistics
   */
  getSessionAttendance: (sessionId, filters = {}) =>
    api.get(`${API_BASE}/session/${sessionId}/`, { params: filters })
      .then(res => res.data),
  
  /**
   * Get attendance history for a student
   * @param {string} studentId - UUID of the student
   * @param {Object} filters - Optional filters (date_from, date_to, subject_id, status)
   * @returns {Promise} Response with student attendance history and statistics
   */
  getStudentHistory: (studentId, filters = {}) =>
    api.get(`${API_BASE}/student/${studentId}/`, { params: filters })
      .then(res => res.data),
  
  /**
   * Update an existing attendance record
   * @param {string} attendanceId - UUID of the attendance record
   * @param {Object} data - Updated data {status, notes}
   * @returns {Promise} Response with updated attendance record
   */
  updateAttendance: (attendanceId, data) =>
    api.put(`${API_BASE}/${attendanceId}/`, data)
      .then(res => res.data),
  
  /**
   * Get all attendance records (with optional filters)
   * @param {Object} filters - Optional filters
   * @returns {Promise} Response with attendance records
   */
  getAll: (filters = {}) =>
    api.get(`${API_BASE}/`, { params: filters })
      .then(res => res.data),
};
