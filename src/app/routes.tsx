import { createBrowserRouter, Navigate } from "react-router";

import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";

import AccountingPage from "./pages/Accounting";
import AdvancedReportsPage from "./pages/AdvancedReports";
import AccessManagementPage from "./pages/AccessManagement";
import AgenciesPage from "./pages/Agencies";
import ApartmentsBoardPage from "./pages/ApartmentsBoard";
import AutomationsPage from "./pages/Automations";
import BookingsPage from "./pages/Bookings";
import BookingDetailPage from "./pages/BookingDetail";
import NewBookingPage from "./pages/BookingNew";
import CalendarPage from "./pages/CalendarPage";
import ChannelManagerPage from "./pages/ChannelManager";
import CleaningPage from "./pages/Cleaning";
import ClientsPage from "./pages/Clients";
import ClientDetailPage from "./pages/ClientDetail";
import DashboardPage from "./pages/Dashboard";
import FAQAdminPage from "./pages/FAQAdmin";
import LoginPage from "./pages/Login";
import MaintenancePage from "./pages/Maintenance";
import PaymentsPage from "./pages/Payments";
import PropertiesPage from "./pages/Properties";
import PropertyDetailPage from "./pages/PropertyDetail";
import PropertyFormPage from "./pages/PropertyForm";
import ChatbotPage from "./pages/ChatbotPage";
import TeamPage from "./pages/TeamPage";
import OwnersPortalPage from "./pages/OwnersPortal";
import UnifiedInboxPage from "./pages/UnifiedInbox";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: DashboardPage },
      { path: "apartments/board", Component: ApartmentsBoardPage },
      { path: "cms/properties", Component: PropertiesPage },
      { path: "cms/properties/new", Component: PropertyFormPage },
      { path: "cms/properties/:id/edit", Component: PropertyFormPage },
      { path: "property/:id", Component: PropertyDetailPage },
      { path: "bookings", Component: BookingsPage },
      { path: "bookings/new", Component: NewBookingPage },
      { path: "bookings/:id", Component: BookingDetailPage },
      { path: "clients", Component: ClientsPage },
      { path: "clients/:id", Component: ClientDetailPage },
      { path: "payments", Component: PaymentsPage },
      { path: "agencies", Component: AgenciesPage },
      { path: "cleaning", Component: CleaningPage },
      { path: "maintenance", Component: MaintenancePage },
      { path: "calendar", Component: CalendarPage },
      { path: "accounting", Component: AccountingPage },
      { path: "reports", Component: AdvancedReportsPage },
      { path: "channels", Component: ChannelManagerPage },
      { path: "inbox", Component: UnifiedInboxPage },
      { path: "automations", Component: AutomationsPage },
      { path: "owners", Component: OwnersPortalPage },
      { path: "faq/admin", Component: FAQAdminPage },
      { path: "team", Component: TeamPage },
      { path: "team/access", Component: AccessManagementPage },
      { path: "chatbot", Component: ChatbotPage },
    ],
  },
]);
