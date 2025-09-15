import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MultiStepForm from './pages/MultiStepForm';
import './index.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/form" element={<MultiStepForm />} />
    </Routes>
  );
}

export default App;