import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Notifications } from "@/components/notifications";
import { FloatingTeddyAssistant } from "@/components/floating-teddy-assistant";
import { CallNotification } from "@/components/call-notification";
import { Loader2 } from "lucide-react";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import DoctorDashboard from "@/pages/doctor/dashboard";
import DoctorPatients from "@/pages/doctor/patients";
import PatientDetail from "@/pages/doctor/patient-detail";
import DoctorSurveys from "@/pages/doctor/surveys";
import DoctorNotes from "@/pages/doctor/notes";
import DoctorAppointments from "@/pages/doctor/appointments";
import DoctorMeetings from "@/pages/doctor/meetings";
import QRGenerator from "@/pages/doctor/qr-generator";
import Monitor from "@/pages/doctor/monitor";
import PatientDashboard from "@/pages/patient/dashboard";
import PatientSurveys from "@/pages/patient/surveys";
import PatientDoctors from "@/pages/patient/doctors";
import PatientAppointments from "@/pages/patient/appointments";
import Meeting from "@/pages/meeting";
import LinkPatient from "@/pages/link-patient";
import SurveyResponse from "@/pages/survey-response";
import Settings from "@/pages/settings";
import PeerNetwork from "@/pages/peer-network";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shrink-0 shadow-sm">
            <SidebarTrigger data-testid="button-sidebar-toggle" className="rounded-lg" />
            <div className="flex items-center gap-3">
              <Notifications />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        {/* Floating AI Assistant - Available on all authenticated pages */}
        <FloatingTeddyAssistant />
        {/* Call Notification Popup - Shows when someone calls */}
        <CallNotification />
      </div>
    </SidebarProvider>
  );
}

function ProtectedRoute({ component: Component, allowedRoles }: { component: React.ComponentType; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      setLocation(user.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
    }
  }, [user, isLoading, allowedRoles, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
    return null;
  }

  return (
    <AuthenticatedLayout>
      <Component />
    </AuthenticatedLayout>
  );
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isLoading && user) {
      setLocation(user.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return <Component />;
}


function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <PublicRoute component={Landing} />} />
      <Route path="/login" component={() => <PublicRoute component={Login} />} />
      <Route path="/register" component={() => <PublicRoute component={Register} />} />
      
      <Route path="/doctor/dashboard" component={() => <ProtectedRoute component={DoctorDashboard} allowedRoles={["doctor"]} />} />
      <Route path="/doctor/patients" component={() => <ProtectedRoute component={DoctorPatients} allowedRoles={["doctor"]} />} />
      <Route path="/doctor/patients/:id" component={() => <ProtectedRoute component={PatientDetail} allowedRoles={["doctor"]} />} />
      <Route path="/doctor/patients/:id/survey" component={() => <ProtectedRoute component={DoctorSurveys} allowedRoles={["doctor"]} />} />
      <Route path="/doctor/surveys" component={() => <ProtectedRoute component={DoctorSurveys} allowedRoles={["doctor"]} />} />
      <Route path="/doctor/notes" component={() => <ProtectedRoute component={DoctorNotes} allowedRoles={["doctor"]} />} />
      <Route path="/doctor/appointments" component={() => <ProtectedRoute component={DoctorAppointments} allowedRoles={["doctor"]} />} />
      <Route path="/doctor/meetings" component={() => <ProtectedRoute component={DoctorMeetings} allowedRoles={["doctor"]} />} />
      <Route path="/doctor/qr" component={() => <ProtectedRoute component={QRGenerator} allowedRoles={["doctor"]} />} />
      <Route path="/doctor/monitor" component={() => <ProtectedRoute component={Monitor} allowedRoles={["doctor"]} />} />
      
      <Route path="/patient/dashboard" component={() => <ProtectedRoute component={PatientDashboard} allowedRoles={["patient"]} />} />
      <Route path="/patient/surveys" component={() => <ProtectedRoute component={PatientSurveys} allowedRoles={["patient"]} />} />
      <Route path="/patient/doctors" component={() => <ProtectedRoute component={PatientDoctors} allowedRoles={["patient"]} />} />
      <Route path="/patient/appointments" component={() => <ProtectedRoute component={PatientAppointments} allowedRoles={["patient"]} />} />
      
      <Route path="/meeting/:id" component={() => <ProtectedRoute component={Meeting} />} />
      <Route path="/link/:token" component={() => <ProtectedRoute component={LinkPatient} />} />
      <Route path="/survey/:id" component={() => <SurveyResponse />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/peer-network" component={() => <ProtectedRoute component={PeerNetwork} />} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="teleclinic-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
