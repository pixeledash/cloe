import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    mfaToken: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(
        formData.email,
        formData.password,
        mfaRequired ? formData.mfaToken : null
      );

      if (result.mfaRequired) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      if (result.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary px-4 py-8">
      <div className="bg-white rounded-xl shadow-2xl p-8 md:p-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo-with-text.png" 
              alt="Cloe" 
              className="h-16 object-contain"
            />
          </div>
          <h2 className="text-gray-900 text-2xl font-semibold mb-2">
            Sign In
          </h2>
          <p className="text-gray-600 text-sm">
            Welcome back! Please login to your account.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!mfaRequired ? (
            <>
              {/* Email Field */}
              <div>
                <label 
                  htmlFor="email" 
                  className="block text-gray-700 font-semibold mb-2 text-sm"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  className="input-field"
                />
              </div>

              {/* Password Field */}
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-gray-700 font-semibold mb-2 text-sm"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="input-field"
                />
              </div>
            </>
          ) : (
            /* MFA Field */
            <div>
              <label 
                htmlFor="mfaToken" 
                className="block text-gray-700 font-semibold mb-2 text-sm"
              >
                MFA Token
              </label>
              <input
                type="text"
                id="mfaToken"
                name="mfaToken"
                value={formData.mfaToken}
                onChange={handleChange}
                placeholder="Enter 6-digit code"
                required
                maxLength="6"
                autoComplete="one-time-code"
                className="input-field"
              />
              <p className="text-gray-500 text-xs mt-2">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Signing in...' : mfaRequired ? 'Verify MFA' : 'Sign In'}
          </button>

          {/* Back Button for MFA */}
          {mfaRequired && (
            <button
              type="button"
              onClick={() => {
                setMfaRequired(false);
                setFormData({ ...formData, mfaToken: '' });
              }}
              className="btn-secondary w-full"
            >
              Back
            </button>
          )}
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-purple-600 font-semibold hover:underline">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
