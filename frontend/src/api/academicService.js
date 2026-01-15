import api from './axios';

// ============================================================================
// SUBJECTS API
// ============================================================================

export const subjectService = {
  // Get all subjects
  getAll: async () => {
    const response = await api.get('/classes/subjects/');
    return response.data;
  },

  // Get single subject by ID
  getById: async (id) => {
    const response = await api.get(`/classes/subjects/${id}/`);
    return response.data;
  },

  // Create new subject
  create: async (data) => {
    const response = await api.post('/classes/subjects/', data);
    return response.data;
  },

  // Update subject
  update: async (id, data) => {
    const response = await api.put(`/classes/subjects/${id}/`, data);
    return response.data;
  },

  // Delete subject
  delete: async (id) => {
    const response = await api.delete(`/classes/subjects/${id}/`);
    return response.data;
  },
};

// ============================================================================
// CLASSES API
// ============================================================================

export const classService = {
  // Get all classes
  getAll: async () => {
    const response = await api.get('/classes/classes/');
    return response.data;
  },

  // Get single class by ID
  getById: async (id) => {
    const response = await api.get(`/classes/classes/${id}/`);
    return response.data;
  },

  // Create new class
  create: async (data) => {
    const response = await api.post('/classes/classes/', data);
    return response.data;
  },

  // Update class
  update: async (id, data) => {
    const response = await api.put(`/classes/classes/${id}/`, data);
    return response.data;
  },

  // Delete class
  delete: async (id) => {
    const response = await api.delete(`/classes/classes/${id}/`);
    return response.data;
  },
};

// ============================================================================
// STUDENTS API
// ============================================================================

export const studentService = {
  // Get all students (with optional class filter)
  getAll: async (classId = null) => {
    const url = classId ? `/classes/students/?class_id=${classId}` : '/classes/students/';
    const response = await api.get(url);
    return response.data;
  },

  // Get single student by ID
  getById: async (id) => {
    const response = await api.get(`/classes/students/${id}/`);
    return response.data;
  },

  // Create new student
  create: async (data) => {
    const response = await api.post('/classes/students/', data);
    return response.data;
  },

  // Update student
  update: async (id, data) => {
    const response = await api.put(`/classes/students/${id}/`, data);
    return response.data;
  },

  // Delete student
  delete: async (id) => {
    const response = await api.delete(`/classes/students/${id}/`);
    return response.data;
  },
};

// ============================================================================
// TEACHERS API (for class assignment)
// ============================================================================

export const teacherService = {
  // Get all teachers (lightweight list for dropdowns)
  getAll: async () => {
    const response = await api.get('/classes/teachers/');
    return response.data;
  },
};

// ============================================================================
// ENROLLMENT API (for managing student enrollments)
// ============================================================================

export const enrollmentService = {
  // Enroll a student in a class
  enrollStudent: async (classId, studentId) => {
    const response = await api.post(`/classes/classes/${classId}/enroll/`, {
      student_id: studentId,
    });
    return response.data;
  },
  
  // Unenroll a student from a class
  unenrollStudent: async (classId, studentId) => {
    const response = await api.post(`/classes/classes/${classId}/unenroll/`, {
      student_id: studentId,
    });
    return response.data;
  },
};

export default {
  subjects: subjectService,
  classes: classService,
  students: studentService,
  teachers: teacherService,
  enrollments: enrollmentService,
};
