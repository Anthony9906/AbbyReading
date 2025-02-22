import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Units from './pages/Units';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/units" element={<Units />} />
        </Routes>
      </Router>
      <Toaster position="top-center" />
    </>
  );
}

export default App;
