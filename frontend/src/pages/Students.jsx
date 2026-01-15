import { useState, useEffect } from 'react';
import { studentService, classService, enrollmentService } from '../api/academicService';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [managingStudent, setManagingStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    student_id: '',
    enrollment_date: new Date().toISOString().split('T')[0], // Today's date
  });

  const [enrollmentData, setEnrollmentData] = useState({
    selectedClasses: [],
  });

  useEffect(() => {
    fetchData();
  }, [filterClass]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentsData, classesData] = await Promise.all([
        filterClass ? studentService.getAll(filterClass) : studentService.getAll(),
        classService.getAll(),
      ]);
      setStudents(studentsData);
      setClasses(classesData);
    } catch (err) {
      setError('Failed to load data: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        student_id: student.student_id,
        enrollment_date: student.enrollment_date || new Date().toISOString().split('T')[0],
      });
    } else {
      setEditingStudent(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        student_id: '',
        enrollment_date: new Date().toISOString().split('T')[0],
      });
    }
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    setFormData({ 
      first_name: '', 
      last_name: '', 
      email: '', 
      student_id: '',
      enrollment_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleOpenEnrollmentModal = (student) => {
    setManagingStudent(student);
    // Get IDs of classes the student is enrolled in
    const enrolledClassIds = student.enrolled_classes?.map(c => c.id) || [];
    setEnrollmentData({
      selectedClasses: enrolledClassIds,
    });
    setShowEnrollmentModal(true);
    setError('');
    setSuccess('');
  };

  const handleCloseEnrollmentModal = () => {
    setShowEnrollmentModal(false);
    setManagingStudent(null);
    setEnrollmentData({ selectedClasses: [] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingStudent) {
        await studentService.update(editingStudent.id, formData);
        setSuccess('Student updated successfully!');
      } else {
        await studentService.create(formData);
        setSuccess('Student created successfully!');
      }
      
      handleCloseModal();
      await fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.first_name?.[0] ||
                      err.response?.data?.last_name?.[0] ||
                      err.response?.data?.email?.[0] ||
                      err.response?.data?.student_id?.[0] ||
                      JSON.stringify(err.response?.data) ||
                      'Failed to save student';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get currently enrolled class IDs
      const currentClassIds = managingStudent.enrolled_classes?.map(c => c.id) || [];
      const selectedClassIds = enrollmentData.selectedClasses;
      
      // Find classes to enroll (newly selected)
      const toEnroll = selectedClassIds.filter(id => !currentClassIds.includes(id));
      
      // Find classes to unenroll (deselected)
      const toUnenroll = currentClassIds.filter(id => !selectedClassIds.includes(id));
      
      // Enroll in new classes
      for (const classId of toEnroll) {
        await enrollmentService.enrollStudent(classId, managingStudent.id);
      }
      
      // Unenroll from removed classes
      for (const classId of toUnenroll) {
        await enrollmentService.unenrollStudent(classId, managingStudent.id);
      }
      
      setSuccess('Enrollment updated successfully!');
      handleCloseEnrollmentModal();
      await fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.error ||
                      JSON.stringify(err.response?.data) ||
                      'Failed to update enrollment';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (student) => {
    const studentName = student.full_name || `${student.first_name} ${student.last_name}`;
    if (!confirm(`Are you sure you want to delete "${studentName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await studentService.delete(student.id);
      setSuccess('Student deleted successfully!');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete student');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickUnenroll = async (student, classToUnenroll) => {
    const studentName = student.full_name || `${student.first_name} ${student.last_name}`;
    if (!confirm(`Unenroll ${studentName} from ${classToUnenroll.name}?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await enrollmentService.unenrollStudent(classToUnenroll.id, student.id);
      setSuccess(`Successfully unenrolled from ${classToUnenroll.name}!`);
      await fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.error ||
                      'Failed to unenroll student';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleClassToggle = (classId) => {
    setEnrollmentData(prev => ({
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter(id => id !== classId)
        : [...prev.selectedClasses, classId],
    }));
  };

  // Filter students based on search
  const filteredStudents = students.filter(student => {
    const fullName = student.full_name || `${student.first_name} ${student.last_name}`;
    const studentId = student.student_id || '';
    return (
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 mt-2">Manage student information and enrollments</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary"
        >
          + Add Student
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      {error && !showModal && !showEnrollmentModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Search students by name, email, or enrollment number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field"
        />
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="input-field"
        >
          <option value="">All Classes</option>
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>
              {classItem.name}
            </option>
          ))}
        </select>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading && students.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
            <p className="text-gray-600 mt-4">Loading students...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Enrolled Classes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      {searchTerm || filterClass ? 'No students found matching your filters' : 'No students yet. Click "Add Student" to create one.'}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {student.full_name || `${student.first_name} ${student.last_name}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600 text-sm">{student.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600 text-sm">
                          {student.student_id || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600 text-sm">
                          {student.enrolled_classes && student.enrolled_classes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {student.enrolled_classes.map((cls) => (
                                <span
                                  key={cls.id}
                                  className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs"
                                >
                                  {cls.name}
                                  <button
                                    onClick={() => handleQuickUnenroll(student, cls)}
                                    className="ml-1 text-purple-600 hover:text-purple-900 font-bold"
                                    title="Unenroll from this class"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No classes</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenEnrollmentModal(student)}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm mr-4"
                        >
                          Manage Classes
                        </button>
                        <button
                          onClick={() => handleOpenModal(student)}
                          className="text-purple-600 hover:text-purple-800 font-semibold text-sm mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(student)}
                          className="text-red-600 hover:text-red-800 font-semibold text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h3>
            </div>

            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                {/* First Name */}
                <div>
                  <label htmlFor="first_name" className="block text-gray-700 font-semibold mb-2 text-sm">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="e.g., John"
                    required
                    className="input-field"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="last_name" className="block text-gray-700 font-semibold mb-2 text-sm">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="e.g., Doe"
                    required
                    className="input-field"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-gray-700 font-semibold mb-2 text-sm">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g., john.doe@example.com"
                    required
                    className="input-field"
                  />
                </div>

                {/* Student ID */}
                <div>
                  <label htmlFor="student_id" className="block text-gray-700 font-semibold mb-2 text-sm">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    id="student_id"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleChange}
                    placeholder="e.g., STU2024001"
                    required
                    className="input-field"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingStudent ? 'Update Student' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Enrollment Modal */}
      {showEnrollmentModal && managingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Manage Class Enrollments
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Student: {managingStudent.full_name || `${managingStudent.first_name} ${managingStudent.last_name}`}
              </p>
            </div>

            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEnrollmentSubmit}>
              <div className="px-6 py-4 max-h-96 overflow-y-auto">
                {classes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No classes available. Please create classes first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {classes.map((classItem) => (
                      <label
                        key={classItem.id}
                        className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={enrollmentData.selectedClasses.includes(classItem.id)}
                          onChange={() => handleClassToggle(classItem.id)}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="font-medium text-gray-900">{classItem.name}</div>
                          <div className="text-sm text-gray-600">
                            {classItem.subject?.name || classItem.subject_name} · {classItem.teacher?.full_name || classItem.teacher_name}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseEnrollmentModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || classes.length === 0}
                >
                  {loading ? 'Saving...' : 'Update Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
