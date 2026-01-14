// All backend API endpoints

const endpoints = {
  // Authentication
  auth: {
    login: '/users/login/',
    register: '/users/register/',
    me: '/users/me/',
    tokenRefresh: '/users/token/refresh/',
    mfaSetup: '/users/mfa/setup/',
    mfaVerify: '/users/mfa/verify/',
    mfaDisable: '/users/mfa/disable/',
  },

  // Roles
  roles: '/users/roles/',

  // Classes
  classes: {
    list: '/classes/',
    detail: (id) => `/classes/${id}/`,
    students: (id) => `/classes/${id}/students/`,
  },

  // Students
  students: {
    list: '/students/',
    detail: (id) => `/students/${id}/`,
  },

  // Subjects
  subjects: {
    list: '/subjects/',
    detail: (id) => `/subjects/${id}/`,
  },

  // Sessions
  sessions: {
    list: '/sessions/',
    start: '/sessions/start/',
    active: '/sessions/active/',
    detail: (id) => `/sessions/${id}/`,
    end: (id) => `/sessions/${id}/end/`,
  },

  // Attendance
  attendance: {
    mark: '/attendance/mark/',
    session: (id) => `/attendance/session/${id}/`,
    student: (id) => `/attendance/student/${id}/`,
  },

  // Analytics
  analytics: {
    student: (id) => `/analytics/student/${id}/`,
    class: (id) => `/analytics/class/${id}/`,
    overview: '/analytics/overview/',
  },

  // Reports
  reports: {
    generate: '/reports/generate/',
    list: '/reports/',
    download: (id) => `/reports/${id}/download/`,
  },

  // Notifications
  notifications: {
    weekly: '/notify/weekly/',
  },
};

export default endpoints;
