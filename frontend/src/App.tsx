import { Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute } from "@/components/GuestRoute";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { FarmerLayout } from "@/pages/farmer/FarmerLayout";
import {
  FarmerAdvisoryPage,
  FarmerDashboard,
  FarmerInputsPage,
  FarmerMarketPage,
  FarmerMessagesPage,
  FarmerProfilePage,
  FarmerSalesPage,
  FarmerWeatherPage,
} from "@/pages/farmer/FarmerPages";
import { AgentDashboard, AdminDashboard } from "@/pages/portals/PortalPages";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<GuestRoute />}>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={["farmer"]} />}>
        <Route path="/farmer" element={<FarmerLayout />}>
          <Route index element={<FarmerDashboard />} />
          <Route path="advisory" element={<FarmerAdvisoryPage />} />
          <Route path="weather" element={<FarmerWeatherPage />} />
          <Route path="market" element={<FarmerMarketPage />} />
          <Route path="inputs" element={<FarmerInputsPage />} />
          <Route path="sales" element={<FarmerSalesPage />} />
          <Route path="messages" element={<FarmerMessagesPage />} />
          <Route path="profile" element={<FarmerProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["extension_agent"]} />}>
        <Route path="/agent" element={<AgentDashboard />} />
      </Route>

      <Route element={<ProtectedRoute roles={["district_admin"]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      <Route path="/app" element={<Navigate to="/farmer" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
