// App-Rahmen: Navigation (Desktop + Mobile-Tabs), Inhalt, minimaler Footer
// mit Datenschutzhinweis.

import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { logoutUrl } from '../lib/auth';
import type { MeDto } from '../lib/types';

interface Props {
  me: MeDto;
  children: ReactNode;
}

const navItems = [
  { to: '/tippen', label: 'Tippen' },
  { to: '/weltmeister', label: 'Weltmeister' },
  { to: '/spielplan', label: 'Spielplan' },
  { to: '/rangliste', label: 'Rangliste' },
  { to: '/profil', label: 'Profil' },
];

export function Layout({ me, children }: Props) {
  const items = me.isAdmin ? [...navItems, { to: '/admin', label: 'Admin' }] : navItems;

  return (
    <div className="app-shell">
      <nav className="nav">
        <div className="container nav-inner">
          <NavLink to="/tippen" className="nav-logo" aria-label="Einklang Tippspiel">
            <Logo size={28} />
          </NavLink>
          <div className="nav-links desktop">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                {i.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-user">
            <span className="name caption">{me.rosterName}</span>
            <a className="btn btn-outline btn-sm" href={logoutUrl}>
              Abmelden
            </a>
          </div>
        </div>
      </nav>

      {/* Mobile: horizontal scrollbarer Tab-Streifen */}
      <div className="nav-mobile">
        <div className="nav-links">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {i.label}
            </NavLink>
          ))}
        </div>
      </div>

      <main className="container">{children}</main>

      <footer className="footer">
        <div className="container">
          <p>© {new Date().getFullYear()} Einklang Energy · Internes WM-2026-Tippspiel</p>
          <p>
            Datenschutz: Es werden ausschließlich Anzeigename und E-Mail aus dem Firmenkonto
            gespeichert. Keine Tracker, alle Daten in der EU-Region.
          </p>
        </div>
      </footer>
    </div>
  );
}
