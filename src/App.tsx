import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './components/Home';
import { Layout } from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          {/* 后续添加更多路由 */}
          {/* <Route path="login" element={<Login />} /> */}
          {/* <Route path="register" element={<Register />} /> */}
          {/* <Route path="profile" element={<Profile />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
