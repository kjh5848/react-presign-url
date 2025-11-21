import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import ListPage from "./pages/ListPage";
import DetailPage from "./pages/DetailPage";

export default function App() {
  return (
    <Router>
      <header style={{ padding: 16, background: "#f4f4f4" }}>
        <Link to="/">목록</Link> | <Link to="/upload">업로드</Link>
      </header>

      <Routes>
        <Route path="/" element={<ListPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/detail/:id" element={<DetailPage />} />
      </Routes>
    </Router>
  );
}
