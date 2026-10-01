import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DomainRouter from "@/components/DomainRouter";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-loaded pages
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const StorefrontLayout = lazy(() => import("./components/storefront/StorefrontLayout"));
const StorefrontHome = lazy(() => import("./pages/storefront/StorefrontHome"));
const StorefrontServices = lazy(() => import("./pages/storefront/StorefrontServices"));
const StorefrontServiceDetail = lazy(() => import("./pages/storefront/StorefrontServiceDetail"));
const StorefrontSearch = lazy(() => import("./pages/storefront/StorefrontSearch"));
const StorefrontContact = lazy(() => import("./pages/storefront/StorefrontContact"));
const StorefrontAbout = lazy(() => import("./pages/storefront/StorefrontAbout"));
const PaymentSuccess = lazy(() => import("./pages/storefront/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/storefront/PaymentCancel"));
const AgencyAdminLayout = lazy(() => import("./components/agency-admin/AgencyAdminLayout"));
const AgencyAdminDashboard = lazy(() => import("./pages/agency-admin/AgencyAdminDashboard"));
const AgencyAdminBookings = lazy(() => import("./pages/agency-admin/AgencyAdminBookings"));
const AgencyAdminSettings = lazy(() => import("./pages/agency-admin/AgencyAdminSettings"));
const AgencyAdminDrivers = lazy(() => import("./pages/agency-admin/AgencyAdminDrivers"));
const AgencyAdminVehicles = lazy(() => import("./pages/agency-admin/AgencyAdminVehicles"));
const AgencyAdminCalendar = lazy(() => import("./pages/agency-admin/AgencyAdminCalendar"));
const AgencyAdminServicesPricing = lazy(() => import("./pages/agency-admin/AgencyAdminServicesPricing"));
const AgencyAdminApartments = lazy(() => import("./pages/agency-admin/AgencyAdminApartments"));
const AgencyAdminMessages = lazy(() => import("./pages/agency-admin/AgencyAdminMessages"));
const AgencyAdminLiveMap = lazy(() => import("./pages/agency-admin/AgencyAdminLiveMap"));
const DriverLogin = lazy(() => import("./pages/driver/DriverLogin"));
const DriverDashboard = lazy(() => import("./pages/driver/DriverDashboard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Agencies = lazy(() => import("./pages/Agencies"));
const Bookings = lazy(() => import("./pages/Bookings"));
const Calendar = lazy(() => import("./pages/Calendar"));
const ServicesPricing = lazy(() => import("./pages/ServicesPricing"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const Assignments = lazy(() => import("./pages/Assignments"));
const Users = lazy(() => import("./pages/Users"));
const Analytics = lazy(() => import("./pages/Analytics"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Skeleton className="h-12 w-48" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <DomainRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/driver/login" element={<DriverLogin />} />
                  <Route path="/driver" element={<DriverDashboard />} />
                  <Route
                    element={
                      <ProtectedRoute requiredRole="super_admin">
                        <AdminLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/agencies" element={<Agencies />} />
                    <Route path="/vehicles" element={<Vehicles />} />
                    <Route path="/drivers" element={<ComingSoon title="Drivers" />} />
                    <Route path="/assignments" element={<Assignments />} />
                    <Route path="/bookings" element={<Bookings />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/services-pricing" element={<ServicesPricing />} />
                    <Route path="/settings" element={<ComingSoon title="Settings" />} />
                  </Route>
                  <Route path="/agency/:slug/admin" element={<AgencyAdminLayout />}>
                    <Route index element={<AgencyAdminDashboard />} />
                    <Route path="fleet" element={<AgencyAdminVehicles />} />
                    <Route path="reservations" element={<AgencyAdminBookings />} />
                    <Route path="calendar" element={<AgencyAdminCalendar />} />
                    <Route path="clients" element={<ComingSoon title="Clients" />} />
                    <Route path="services-pricing" element={<AgencyAdminServicesPricing />} />
                    <Route path="drivers" element={<AgencyAdminDrivers />} />
                    <Route path="settings" element={<AgencyAdminSettings />} />
                  </Route>
                  <Route path="/agency/:slug" element={<StorefrontLayout />}>
                    <Route index element={<StorefrontHome />} />
                    <Route path="services" element={<StorefrontServices />} />
                    <Route path="services/:serviceType" element={<StorefrontServiceDetail />} />
                    <Route path="search/:serviceType" element={<StorefrontSearch />} />
                    <Route path="fleet" element={<StorefrontServices />} />
                    <Route path="contact" element={<StorefrontContact />} />
                    <Route path="about" element={<StorefrontAbout />} />
                    <Route path="payment-success" element={<PaymentSuccess />} />
                    <Route path="payment-cancel" element={<PaymentCancel />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </DomainRouter>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
