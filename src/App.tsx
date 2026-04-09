import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import VisitAgenda from "./pages/VisitAgenda";
import VisitReport from "./pages/VisitReport";
import Visits from "./pages/Visits";
import Payments from "./pages/Payments";
import Library from "./pages/Library";
import Regulatory from "./pages/Regulatory";
import CenterManagement from "./pages/CenterManagement";
import NotFound from "./pages/NotFound";
import ProjectSchedule from "./pages/ProjectSchedule";
import EDCDesigner from "./pages/EDCDesigner";
import CRFDataEntry from "./pages/CRFDataEntry";
import CRFEntryList from "./pages/CRFEntryList";
import ETMF from "./pages/ETMF";
import ETMFDocument from "./pages/ETMFDocument";
import AdminUsers from "./pages/AdminUsers";
import AdminAudit from "./pages/AdminAudit";
import Communications from "./pages/Communications";
import Settings from "./pages/Settings";

// EDC Module with Layout
import { EDCLayout } from "./components/edc/EDCLayout";
import EDCDashboard from "./pages/edc/EDCDashboard";
import EDCParticipants from "./pages/edc/EDCParticipants";
import EDCParticipantDetail from "./pages/edc/EDCParticipantDetail";
import EDCQueries from "./pages/edc/EDCQueries";
import EDCSafetyEvents from "./pages/edc/EDCSafetyEvents";
import EDCDeviations from "./pages/edc/EDCDeviations";
import EDCTemplates from "./pages/edc/EDCTemplates";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Home - Module Selection */}
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />

            {/* CTMS Routes */}
            <Route path="/ctms" element={<Dashboard />} />
            <Route path="/ctms/communications" element={<Communications />} />
            <Route path="/ctms/agenda" element={<VisitAgenda />} />
            <Route path="/ctms/tasks" element={<Tasks />} />
            <Route path="/ctms/projects" element={<Projects />} />
            <Route path="/ctms/projects/:projectId/schedule" element={<ProjectSchedule />} />
            <Route path="/ctms/centers" element={<CenterManagement />} />
            <Route path="/ctms/regulatory" element={<Regulatory />} />
            <Route path="/ctms/payments" element={<Payments />} />
            <Route path="/ctms/library" element={<Library />} />
            <Route path="/ctms/settings" element={<Settings />} />
            <Route path="/ctms/settings/users" element={<AdminUsers />} />
            <Route path="/ctms/settings/audit" element={<AdminAudit />} />

            {/* EDC Routes with Sidebar Layout */}
            <Route path="/edc" element={<EDCLayout />}>
              <Route index element={<EDCDashboard />} />
              <Route path="participants" element={<EDCParticipants />} />
              <Route path="participants/:participantId" element={<EDCParticipantDetail />} />
              <Route path="queries" element={<EDCQueries />} />
              <Route path="safety" element={<EDCSafetyEvents />} />
              <Route path="deviations" element={<EDCDeviations />} />
              <Route path="templates" element={<EDCTemplates />} />
              <Route path="entries" element={<CRFEntryList />} />
            </Route>
            <Route path="/edc/designer/:templateId" element={<EDCDesigner />} />
            <Route path="/edc/entry/:entryId" element={<CRFDataEntry />} />
            <Route path="/edc/visits" element={<Visits />} />
            <Route path="/edc/visits/:id" element={<VisitReport />} />

            {/* eTMF Routes */}
            <Route path="/etmf" element={<ETMF />} />
            <Route path="/etmf/document/:documentId" element={<ETMFDocument />} />

            {/* Legacy routes - redirect to new structure */}
            <Route path="/projects" element={<Projects />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/visits" element={<Visits />} />
            <Route path="/payments" element={<Payments />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
