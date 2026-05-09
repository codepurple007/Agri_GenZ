import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LandingPage } from "@/pages/LandingPage";
import { FarmerSmsRegisterPage } from "@/pages/farmer/FarmerSmsRegisterPage";
import { KebeleAdvisoryPage } from "@/pages/kebele/KebeleAdvisoryPage";
import { KebeleBroadcastPage } from "@/pages/kebele/KebeleBroadcastPage";
import { KebeleBroadcastStatusPage } from "@/pages/kebele/KebeleBroadcastStatusPage";
import { KebeleFarmersPage } from "@/pages/kebele/KebeleFarmersPage";
import { KebeleLayout } from "@/pages/kebele/KebeleLayout";
import { LoginPage } from "@/pages/login/LoginPage";
import { SuperAdminLayout } from "@/pages/superadmin/SuperAdminLayout";
import { SuperAdminStaffPage } from "@/pages/superadmin/SuperAdminStaffPage";
import { SuperAdminVoiceUssdPage } from "@/pages/superadmin/SuperAdminVoiceUssdPage";
import { VoiceRecorderJobPage } from "@/pages/voice-recorder/VoiceRecorderJobPage";
import { VoiceRecorderJobsPage } from "@/pages/voice-recorder/VoiceRecorderJobsPage";
import { VoiceRecorderLayout } from "@/pages/voice-recorder/VoiceRecorderLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/farmer/register" element={<FarmerSmsRegisterPage />} />
      <Route element={<ProtectedRoute roles={["kebele_worker"]} />}>
        <Route path="/kebele" element={<KebeleLayout />}>
          <Route path="farmers" element={<KebeleFarmersPage />} />
          <Route path="advisory" element={<KebeleAdvisoryPage />} />
          <Route path="broadcast" element={<KebeleBroadcastPage />} />
          <Route path="broadcast/status/:id" element={<KebeleBroadcastStatusPage />} />
          <Route index element={<Navigate to="/kebele/farmers" replace />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={["voice_recorder_officer"]} />}>
        <Route path="/voice-recorder" element={<VoiceRecorderLayout />}>
          <Route index element={<VoiceRecorderJobsPage />} />
          <Route path="jobs/:jobId" element={<VoiceRecorderJobPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={["superadmin"]} />}>
        <Route path="/superadmin" element={<SuperAdminLayout />}>
          <Route path="staff" element={<SuperAdminStaffPage />} />
          <Route path="voice-ussd" element={<SuperAdminVoiceUssdPage />} />
          <Route index element={<Navigate to="/superadmin/staff" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
