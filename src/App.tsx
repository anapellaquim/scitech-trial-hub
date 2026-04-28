import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import VisitAgenda from "./pages/VisitAgenda";
import VisitReport from "./pages/VisitReport";
import Visits from "./pages/Visits";
import Payments from "./pages/Payments";
import Budget from "./pages/Budget";

import Regulatory from "./pages/Regulatory";
import NotFound from "./pages/NotFound";
import ProjectSchedule from "./pages/ProjectSchedule";
import AdminUsers from "./pages/AdminUsers";
import AdminAudit from "./pages/AdminAudit";
import Communications from "./pages/Communications";
import Settings from "./pages/Settings";

import Qualifications from "./pages/Qualifications";
import Trainings from "./pages/Trainings";
import ChangeControl from "./pages/ChangeControl";
import RiskManagement from "./pages/RiskManagement";
import Committees from "./pages/Committees";
import SteeringDecisions from "./pages/SteeringDecisions";
import SiteMonitoring from "./pages/SiteMonitoring";
import PMCFSurvey from "./pages/PMCFSurvey";
import ClinicalEvaluation from "./pages/ClinicalEvaluation";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* CTMS Routes (root level) */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/communications" element={<Communications />} />
            <Route path="/agenda" element={<VisitAgenda />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId/schedule" element={<ProjectSchedule />} />
            
            <Route path="/regulatory" element={<Regulatory />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/users" element={<AdminUsers />} />
            <Route path="/settings/audit" element={<AdminAudit />} />
            <Route path="/visits" element={<Visits />} />
            <Route path="/visits/:id" element={<VisitReport />} />

            {/* New CTMS Modules */}
            <Route path="/qualifications" element={<Qualifications />} />
            <Route path="/trainings" element={<Trainings />} />
            <Route path="/change-control" element={<ChangeControl />} />
            <Route path="/risks" element={<RiskManagement />} />
            <Route path="/committees" element={<Committees />} />
            <Route path="/steering" element={<SteeringDecisions />} />
            <Route path="/site-monitoring" element={<SiteMonitoring />} />
            <Route path="/pmcf-survey" element={<PMCFSurvey />} />
            <Route path="/clinical-evaluation" element={<ClinicalEvaluation />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
