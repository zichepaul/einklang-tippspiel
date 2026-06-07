// Rangliste – Platz, Name/Spitzname, Gesamtpunkte, exakte Treffer.
// Eigener Eintrag wird hervorgehoben.

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { LeaderboardRow } from '../lib/types';

export function RanglistePage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getLeaderboard()
      .then((d) => setRows(d.leaderboard))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="notice notice-error">{error}</div>;
  if (!rows) return <div className="spinner" aria-label="Lädt" />;

  return (
    <>
      <div className="page-head">
        <h1>Rangliste</h1>
        <p>
          Sortiert nach Gesamtpunkten (inkl. Weltmeister-Wette). Bei Gleichstand zählen mehr exakte
          Treffer, dann mehr Tendenztreffer, dann der Name.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="notice notice-info">Noch keine Teilnehmer.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 56 }}>Platz</th>
              <th>Name</th>
              <th className="num">Punkte</th>
              <th className="num">Exakt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.rank}-${r.name}`} className={r.isMe ? 'me' : ''}>
                <td className="rank">{r.rank}</td>
                <td>
                  {r.name}
                  {r.isMe && <span className="badge badge-soft" style={{ marginLeft: 8 }}>Sie</span>}
                </td>
                <td className="num">{r.totalPoints}</td>
                <td className="num">{r.exactHits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
