// Login-Seite: Einklang-Branding, „Mit Microsoft anmelden", Hinweis zur
// Tenant-Beschränkung. Zeigt bei falscher Domain eine klare Fehlermeldung.

import { Logo } from '../components/Logo';
import { loginUrl, logoutUrl } from '../lib/auth';

export function LoginPage({ forbidden }: { forbidden: string | null }) {
  return (
    <div className="login-wrap">
      <div className="card-gradient login-card">
        <div className="logo">
          <Logo size={32} wordmarkSize={22} />
        </div>
        <h2 style={{ marginBottom: 8 }}>WM-2026-Tippspiel</h2>
        <p style={{ marginBottom: 24 }}>
          Das interne Tippspiel zur Fußball-Weltmeisterschaft 2026. Tippen Sie Ergebnisse,
          sammeln Sie Punkte und messen Sie sich mit dem Team.
        </p>

        {forbidden !== null ? (
          <>
            <div className="notice notice-error" style={{ marginBottom: 16, textAlign: 'left' }}>
              <strong>Kein Zugriff.</strong> Dieses Tippspiel ist ausschließlich für Konten der
              Domain <strong>einklang-energy.de</strong> freigegeben.
              {forbidden && (
                <>
                  {' '}
                  Angemeldet als <strong>{forbidden}</strong>.
                </>
              )}
            </div>
            <a className="btn btn-outline btn-block" href={logoutUrl}>
              Mit anderem Konto anmelden
            </a>
          </>
        ) : (
          <>
            <a className="btn btn-primary btn-block" href={loginUrl}>
              <MicrosoftMark /> Mit Microsoft anmelden
            </a>
            <p className="caption" style={{ marginTop: 16 }}>
              Anmeldung nur mit Ihrem Einklang-Firmenkonto (Microsoft Entra ID). Beim ersten Login
              wird Ihr Profil automatisch angelegt.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function MicrosoftMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#7fba00" d="M12 1h10v10H12z" />
      <path fill="#00a4ef" d="M1 12h10v10H1z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  );
}
