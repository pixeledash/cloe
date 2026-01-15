/**
 * Analytics API Service
 * Handles all analytics-related API calls
 */
import api from './axios';

const API_BASE = '/analytics';

export const analyticsService = {
  /**
   * Get comprehensive analytics for a student
   * @param {string} studentId - Student UUID
   * @returns {Promise} Student analytics data
   */
  getStudentAnalytics: (studentId) => 
    api.get(`${API_BASE}/student/${studentId}/`)
      .then(res => res.data),

  /**
   * Get quick stats for a student
   * @param {string} studentId - Student UUID
   * @returns {Promise} Quick stats
   */
  getStudentQuickStats: (studentId) => 
    api.get(`${API_BASE}/student/${studentId}/quick/`)
      .then(res => res.data),

  /**
   * Get comprehensive analytics for a class
   * @param {string} classId - Class UUID
   * @returns {Promise} Class analytics data
   */
  getClassAnalytics: (classId) => 
    api.get(`${API_BASE}/class/${classId}/`)
      .then(res => res.data),

  /**
   * Get quick stats for a class
   * @param {string} classId - Class UUID
   * @returns {Promise} Quick stats
   */
  getClassQuickStats: (classId) => 
    api.get(`${API_BASE}/class/${classId}/quick/`)
      .then(res => res.data),
};
