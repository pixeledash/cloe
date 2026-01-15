import { useState, useEffect } from 'react';
import { classService, subjectService, teacherService } from '../api/academicService';

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    subject_id: '',
    teacher_id: '',
    academic_year: '2024-2025',
    semester: 'SPRING',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [classesData, subjectsData, teachersData] = await Promise.all([
        classService.getAll(),
        subjectService.getAll(),
        teacherService.getAll(),
      ]);
      setClasses(classesData);
      setSubjects(subjectsData);
      setTeachers(teachersData);
    } catch (err) {
      setError('Failed to load data: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (classItem = null) => {
    if (classItem) {
      setEditingClass(classItem);
      setFormData({
        name: classItem.name,
        subject_id: classItem.subject?.id || '',
        teacher_id: classItem.teacher?.id || '',
        academic_year: classItem.academic_year || '2024-2025',
        semester: classItem.semester || 'SPRING',
      });
    } else {
      setEditingClass(null);
      setFormData({
        name: '',
        subject_id: '',
        teacher_id: '',
        academic_year: '2024-2025',
        semester: 'SPRING',
      });
    }
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClass(null);
    setFormData({ 
      name: '', 
      subject_id: '', 
      teacher_id: '',
      academic_year: '2024-2025',
      semester: 'SPRING',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingClass) {
        await classService.update(editingClass.id, formData);
        setSuccess('Class updated successfully!');
      } else {
        await classService.create(formData);
        setSuccess('Class created successfully!');
      }
      
      handleCloseModal();
      await fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.name?.[0] || 
                      err.response?.data?.subject_id?.[0] ||
                      err.response?.data?.teacher_id?.[0] ||
                      JSON.stringify(err.response?.data) ||
                      'Failed to save class';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (classItem) => {
    if (!confirm(`Are you sure you want to delete "${classItem.name}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await classService.delete(classItem.id);
      setSuccess('Class deleted successfully!');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete class');
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

  // Filter classes based on search
  const filteredClasses = classes.filter(classItem =>
    classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (classItem.subject?.name && classItem.subject.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (classItem.subject_name && classItem.subject_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (classItem.teacher?.full_name && classItem.teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (classItem.teacher_name && classItem.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-600 mt-2">Manage classroom classes</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary"
        >
          + Add Class
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      {error && !showModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search classes by name, subject, or teacher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field max-w-md"
        />
      </div>

      {/* Classes Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading && classes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
            <p className="text-gray-600 mt-4">Loading classes...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Class Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'No classes found matching your search' : 'No classes yet. Click "Add Class" to create one.'}
                    </td>
                  </tr>
                ) : (
                  filteredClasses.map((classItem) => (
                    <tr key={classItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{classItem.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600 text-sm">
                          {classItem.subject?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600 text-sm">
                          {classItem.teacher?.full_name || classItem.teacher_name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600 text-sm">
                          {classItem.enrolled_count || 0} students
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenModal(classItem)}
                          className="text-purple-600 hover:text-purple-800 font-semibold text-sm mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(classItem)}
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingClass ? 'Edit Class' : 'Add New Class'}
              </h3>
            </div>

            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                {/* Class Name */}
                <div>
                  <label htmlFor="name" className="block text-gray-700 font-semibold mb-2 text-sm">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Math 101"
                    required
                    className="input-field"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject_id" className="block text-gray-700 font-semibold mb-2 text-sm">
                    Subject *
                  </label>
                  <select
                    id="subject_id"
                    name="subject_id"
                    value={formData.subject_id}
                    onChange={handleChange}
                    required
                    className="input-field"
                  >
                    <option value="">Select a subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  {subjects.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No subjects available. Please create subjects first.
                    </p>
                  )}
                </div>

                {/* Teacher */}
                <div>
                  <label htmlFor="teacher_id" className="block text-gray-700 font-semibold mb-2 text-sm">
                    Teacher *
                  </label>
                  <select
                    id="teacher_id"
                    name="teacher_id"
                    value={formData.teacher_id}
                    onChange={handleChange}
                    required
                    className="input-field"
                  >
                    <option value="">Select a teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </option>
                    ))}
                  </select>
                  {teachers.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No teachers available.
                    </p>
                  )}
                </div>

                {/* Academic Year */}
                <div>
                  <label htmlFor="academic_year" className="block text-gray-700 font-semibold mb-2 text-sm">
                    Academic Year *
                  </label>
                  <input
                    type="text"
                    id="academic_year"
                    name="academic_year"
                    value={formData.academic_year}
                    onChange={handleChange}
                    placeholder="e.g., 2024-2025"
                    required
                    className="input-field"
                  />
                </div>

                {/* Semester */}
                <div>
                  <label htmlFor="semester" className="block text-gray-700 font-semibold mb-2 text-sm">
                    Semester *
                  </label>
                  <select
                    id="semester"
                    name="semester"
                    value={formData.semester}
                    onChange={handleChange}
                    required
                    className="input-field"
                  >
                    <option value="SPRING">Spring</option>
                    <option value="SUMMER">Summer</option>
                    <option value="FALL">Fall</option>
                    <option value="WINTER">Winter</option>
                  </select>
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
                  disabled={loading || subjects.length === 0 || teachers.length === 0}
                >
                  {loading ? 'Saving...' : editingClass ? 'Update Class' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
