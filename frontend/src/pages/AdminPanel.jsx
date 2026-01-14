import { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';
import { useAuth } from '../auth/AuthContext';

const AdminPanel = () => {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch users
      const usersResponse = await axiosInstance.get('/users/list/');
      setUsers(usersResponse.data);

      // Fetch available roles
      const rolesResponse = await axiosInstance.get('/users/roles/');
      setRoles(rolesResponse.data);
    } catch (err) {
      setError('Failed to load data: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEditRoles = (user) => {
    setSelectedUser(user);
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleUpdateRoles = async (userId, newRoles) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axiosInstance.patch(`/users/${userId}/update-roles/`, {
        roles: newRoles,
      });
      
      setSuccess('User roles updated successfully!');
      setShowModal(false);
      setSelectedUser(null);
      
      // Refresh user list
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update roles');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (roleName) => {
    if (!selectedUser) return;

    const currentRoles = selectedUser.roles || [];
    const newRoles = currentRoles.includes(roleName)
      ? currentRoles.filter(r => r !== roleName)
      : [...currentRoles, roleName];

    setSelectedUser({ ...selectedUser, roles: newRoles });
  };

  const saveRoleChanges = () => {
    if (selectedUser) {
      handleUpdateRoles(selectedUser.id, selectedUser.roles);
    }
  };

  if (!hasRole('ADMIN')) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p>You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-2">Manage users and their roles</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        </div>

        {loading && !showModal ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
            <p className="text-gray-600 mt-4">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    MFA
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-600">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <span
                                key={role}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"
                              >
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">No roles</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.mfa_enabled ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            ✓ Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleEditRoles(user)}
                          className="text-purple-600 hover:text-purple-800 font-semibold text-sm"
                        >
                          Manage Roles
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

      {/* Role Management Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Manage Roles: {selectedUser.first_name} {selectedUser.last_name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{selectedUser.email}</p>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 mb-4">
                Select the roles you want to assign to this user:
              </p>

              <div className="space-y-3">
                {roles.map((role) => (
                  <label
                    key={role.name}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUser.roles?.includes(role.name) || false}
                      onChange={() => toggleRole(role.name)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-semibold text-gray-900">{role.name}</span>
                    </div>
                  </label>
                ))}
              </div>

              {selectedUser.roles?.length === 0 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ User has no roles assigned. They won't be able to access any features.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={saveRoleChanges}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-purple-600">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Teachers</h3>
          <p className="text-3xl font-bold text-purple-600">
            {users.filter(u => u.roles?.includes('TEACHER')).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">MFA Enabled</h3>
          <p className="text-3xl font-bold text-purple-600">
            {users.filter(u => u.mfa_enabled).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
