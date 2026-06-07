import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { TippenPage } from './pages/TippenPage';
import { WeltmeisterPage } from './pages/WeltmeisterPage';
import { SpielplanPage } from './pages/SpielplanPage';
import { TabellenPage } from './pages/TabellenPage';
import { RanglistePage } from './pages/RanglistePage';
import { ProfilPage } from './pages/ProfilPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return <div className="spinner" aria-label="Lädt" />;
  }

  if (auth.status === 'anonymous' || auth.status === 'forbidden') {
    return (
      <Routes>
        <Route
          path="*"
          element={<LoginPage forbidden={auth.status === 'forbidden' ? auth.email : null} />}
        />
      </Routes>
    );
  }

  // authenticated
  const me = auth.me;
  return (
    <ToastProvider>
      <Layout me={me}>
        <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Navigate to="/tippen" replace />} />
          <Route path="/" element={<Navigate to="/tippen" replace />} />
          <Route path="/tippen" element={<TippenPage />} />
          <Route path="/weltmeister" element={<WeltmeisterPage />} />
          <Route path="/spielplan" element={<SpielplanPage />} />
          <Route path="/tabellen" element={<TabellenPage />} />
          <Route path="/rangliste" element={<RanglistePage />} />
          <Route path="/profil" element={<ProfilPage me={me} />} />
          <Route
            path="/admin"
            element={me.isAdmin ? <AdminPage /> : <Navigate to="/tippen" replace />}
          />
          <Route path="*" element={<Navigate to="/tippen" replace />} />
        </Routes>
        </ErrorBoundary>
      </Layout>
    </ToastProvider>
  );
}
