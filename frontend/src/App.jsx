import { Navigate, Route, Routes } from 'react-router-dom';
import MarketingLayout from './layouts/MarketingLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import VerifyOtp from './pages/VerifyOtp.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Payments from './pages/Payments.jsx';
import NewPayment from './pages/NewPayment.jsx';
import PaymentDetail from './pages/PaymentDetail.jsx';
import Customers from './pages/Customers.jsx';
import Products from './pages/Products.jsx';
import WhatsApp from './pages/WhatsApp.jsx';
import Setup from './pages/Setup.jsx';
import Help from './pages/Help.jsx';
import Recurring from './pages/Recurring.jsx';
import Team from './pages/Team.jsx';
import PublicPay from './pages/PublicPay.jsx';
import { useAuth } from './hooks/useAuth.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Landing />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/verify" element={<GuestOnly><VerifyOtp /></GuestOnly>} />
        <Route
          path="/onboarding"
          element={
            <RequireAuth allowOnboarding>
              <Onboarding />
            </RequireAuth>
          }
        />
      </Route>
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="payments" element={<Payments />} />
        <Route path="payments/new" element={<NewPayment />} />
        <Route path="payments/:id" element={<PaymentDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="products" element={<Products />} />
        <Route path="recurring" element={<Recurring />} />
        <Route path="team" element={<Team />} />
        <Route path="whatsapp" element={<WhatsApp />} />
        <Route path="setup" element={<Setup />} />
        <Route path="help" element={<Help />} />
      </Route>
      <Route path="/pay/:paymentId" element={<PublicPay />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function GuestOnly({ children }) {
  const { token, seller, loading } = useAuth();
  if (loading) return <Screen message="Loading..." />;
  if (token && seller?.onboarded) return <Navigate to="/app" replace />;
  if (token && seller && !seller.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function RequireAuth({ children, allowOnboarding = false }) {
  const { token, seller, loading, onboarded } = useAuth();
  if (loading) return <Screen message="Loading..." />;
  if (!token) return <Navigate to="/login" replace />;
  if (!seller) return <Screen message="Unable to connect to PayBot." />;
  if (!onboarded && !allowOnboarding) return <Navigate to="/onboarding" replace />;
  if (onboarded && allowOnboarding) return <Navigate to="/app" replace />;
  return children;
}

function Screen({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream text-sm text-muted">
      {message}
    </div>
  );
}
