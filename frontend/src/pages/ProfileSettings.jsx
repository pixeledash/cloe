import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import axiosInstance from '../api/axios';
import QRCode from 'qrcode';

const ProfileSettings = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile state
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  
  // MFA state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mfaStep, setMfaStep] = useState('initial');
  const [mfaData, setMfaData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // MFA Functions
  const handleSetupMFA = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axiosInstance.get('/users/mfa/setup/');
      setMfaData(response.data);
      
      const qrUrl = await QRCode.toDataURL(response.data.provisioning_uri);
      setQrCodeUrl(qrUrl);
      
      setMfaStep('setup');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to setup MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axiosInstance.post('/users/mfa/verify/', {
        token: verificationCode,
      });
      
      setSuccess('MFA enabled successfully! You will need your authenticator app for future logins.');
      setMfaStep('initial');
      setVerificationCode('');
      setMfaData(null);
      setQrCodeUrl('');
      
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axiosInstance.post('/users/mfa/disable/');
      setSuccess('MFA has been disabled');
      
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              👤 Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'security'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              🔐 Security
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2 text-sm">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={profileData.first_name}
                      disabled
                      className="input-field bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2 text-sm">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profileData.last_name}
                      disabled
                      className="input-field bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="input-field bg-gray-50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    Roles
                  </label>
                  <div className="flex gap-2">
                    {user?.roles?.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Profile editing coming soon. Contact your administrator to update your information.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab - MFA Settings */}
          {activeTab === 'security' && (
            <div>
              {mfaStep === 'initial' && (
                <>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Two-Factor Authentication (MFA)
                      </h2>
                      <p className="text-gray-600">
                        Add an extra layer of security to your account by requiring a verification code from your phone.
                      </p>
                    </div>
                    <div className="ml-6">
                      {user?.mfa_enabled ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                          ✓ Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>

                  {!user?.mfa_enabled ? (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h3 className="text-sm font-semibold text-blue-900 mb-2">How it works:</h3>
                        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                          <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
                          <li>Scan the QR code we provide</li>
                          <li>Enter the 6-digit code from the app to verify</li>
                          <li>From now on, you'll need the code when logging in</li>
                        </ol>
                      </div>

                      <button
                        onClick={handleSetupMFA}
                        disabled={loading}
                        className="btn-primary"
                      >
                        {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-green-800">
                          <strong>MFA is active.</strong> Your account is protected with two-factor authentication.
                        </p>
                      </div>

                      <button
                        onClick={handleDisableMFA}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
                      >
                        {loading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
                      </button>
                    </>
                  )}
                </>
              )}

              {mfaStep === 'setup' && mfaData && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Step 1: Scan QR Code
                  </h2>
                  
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <p className="text-gray-700 mb-4">
                      Scan this QR code with your authenticator app:
                    </p>
                    
                    {qrCodeUrl && (
                      <div className="flex justify-center mb-4">
                        <img src={qrCodeUrl} alt="MFA QR Code" className="border-4 border-white shadow-lg rounded-lg" />
                      </div>
                    )}

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-600 mb-2">
                        Can't scan? Enter this code manually:
                      </p>
                      <code className="block bg-gray-100 px-3 py-2 rounded text-sm font-mono break-all">
                        {mfaData.secret}
                      </code>
                    </div>
                  </div>

                  <button
                    onClick={() => setMfaStep('verify')}
                    className="btn-primary mr-3"
                  >
                    Next: Verify Code
                  </button>
                  
                  <button
                    onClick={() => {
                      setMfaStep('initial');
                      setMfaData(null);
                      setQrCodeUrl('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {mfaStep === 'verify' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Step 2: Verify Your Code
                  </h2>
                  
                  <p className="text-gray-700 mb-6">
                    Enter the 6-digit code from your authenticator app:
                  </p>

                  <form onSubmit={handleVerifyMFA}>
                    <div className="mb-6">
                      <label htmlFor="code" className="block text-gray-700 font-semibold mb-2">
                        Verification Code
                      </label>
                      <input
                        type="text"
                        id="code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        maxLength="6"
                        pattern="\d{6}"
                        required
                        autoComplete="off"
                        className="input-field max-w-xs text-center text-2xl tracking-widest font-mono"
                        autoFocus
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || verificationCode.length !== 6}
                      className="btn-primary mr-3"
                    >
                      {loading ? 'Verifying...' : 'Verify and Enable MFA'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMfaStep('setup')}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                    >
                      Back
                    </button>
                  </form>
                </div>
              )}

              {/* Recommended Apps */}
              {!user?.mfa_enabled && mfaStep === 'initial' && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Recommended Authenticator Apps
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-1">Google Authenticator</h4>
                      <p className="text-sm text-gray-600">Free • iOS & Android</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-1">Authy</h4>
                      <p className="text-sm text-gray-600">Free • iOS, Android & Desktop</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-1">Microsoft Authenticator</h4>
                      <p className="text-sm text-gray-600">Free • iOS & Android</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
