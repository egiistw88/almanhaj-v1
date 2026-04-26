/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import InkubasiPage from "./pages/InkubasiPage";
import PustakaPage from "./pages/PustakaPage";
import CatatanIndexPage from "./pages/CatatanIndexPage";
import CatatanDetailPage from "./pages/CatatanDetailPage";
import MutabaahPage from "./pages/MutabaahPage";
import PetaPage from "./pages/PetaPage";
import { MainLayout } from "./components/layout/MainLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Main App Routes */}
        <Route path="/dashboard" element={<MainLayout><DashboardPage /></MainLayout>} />
        <Route path="/inkubasi" element={<MainLayout><InkubasiPage /></MainLayout>} />
        <Route path="/pustaka" element={<MainLayout><PustakaPage /></MainLayout>} />
        <Route path="/peta" element={<MainLayout><PetaPage /></MainLayout>} />
        <Route path="/catatan" element={<MainLayout><CatatanIndexPage /></MainLayout>} />
        <Route path="/catatan/:id" element={<MainLayout><CatatanDetailPage /></MainLayout>} />
        <Route path="/mutabaah" element={<MainLayout><MutabaahPage /></MainLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
