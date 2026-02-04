import { Routes, Route, Navigate } from "react-router-dom";
import IntakeWizard from "./components/IntakeWizard.jsx";
import Results from "./pages/Results.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IntakeWizard />} />
      <Route path="/results" element={<Results />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}