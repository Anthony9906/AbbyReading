import { Outlet } from 'react-router-dom';

export const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Outlet />
    </div>
  );
};

export default Layout; 