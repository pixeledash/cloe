/**
 * Session Service
 * API service layer for class session management
 */
import api from './axios';

const API_BASE = '/sessions/sessions';

export const sessionService = {
  /**
   * Start a new class session
   * @param {string} classId - UUID of the class
   * @returns {Promise} Response with session details
   */
  start: (classId) => 
    api.post(`${API_BASE}/start/`, { class_id: classId })
      .then(res => res.data),
  
  /**
   * Get all active sessions
   * @param {Object} filters - Optional filters (class_id, teacher_id, subject_id)
   * @returns {Promise} Response with active sessions list
   */
  getActive: (filters = {}) => 
    api.get(`${API_BASE}/active/`, { params: filters })
      .then(res => res.data),
  
  /**
   * End an active session
   * @param {string} sessionId - UUID of the session
   * @returns {Promise} Response with updated session details
   */
  end: (sessionId) => 
    api.post(`${API_BASE}/${sessionId}/end/`, {})
      .then(res => res.data),
  
  /**
   * Get session details
   * @param {string} sessionId - UUID of the session
   * @returns {Promise} Response with session details
   */
  getDetails: (sessionId) => 
    api.get(`${API_BASE}/${sessionId}/`)
      .then(res => res.data),
  
  /**
   * Get session history with filters
   * @param {Object} filters - Optional filters (date_from, date_to, status, etc.)
   * @returns {Promise} Response with session history
   */
  getHistory: (filters = {}) => 
    api.get(`${API_BASE}/history/`, { params: filters })
      .then(res => res.data),
  
  /**
   * Get all sessions (list view)
   * @returns {Promise} Response with all sessions
   */
  getAll: () => 
    api.get(`${API_BASE}/`)
      .then(res => res.data),
};
