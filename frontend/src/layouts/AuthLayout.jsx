import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-primary">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
