import { Outlet } from 'react-router-dom';
import '../styles/components/Layout.css';

export const Layout = () => {
  return (
    <div className="layout">
      <Outlet />
    </div>
  );
};

export default Layout; 