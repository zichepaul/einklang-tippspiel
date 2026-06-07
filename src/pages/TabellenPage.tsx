// Tabellen – Live-Gruppentabellen der WM, berechnet aus den Ergebnissen.
// Die ersten beiden je Gruppe sind hervorgehoben (Achtung: zusätzlich ziehen
// die besten Gruppendritten weiter – das ist hier nicht markiert).

import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { MatchDto } from '../lib/types';
import { computeGroupStandings } from '../lib/standings';

export function TabellenPage() {
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMatches()
      .then((d) => setMatches(d.matches))
      .catch((e) => setError(e.message));
  }, []);

  const standings = useMemo(() => computeGroupStandings(matches ?? []), [matches]);

  if (error) return <div className="notice notice-error">{error}</div>;
  if (!matches) return <div className="spinner" aria-label="Lädt" />;

  return (
    <>
      <div className="page-head">
        <h1>Tabellen</h1>
        <p>
          Gruppentabellen auf Basis der bisherigen Ergebnisse (90 Min). Die ersten beiden Plätze
          (hervorgehoben) erreichen sicher die K.-o.-Runde; zusätzlich ziehen die besten
          Gruppendritten weiter.
        </p>
      </div>

      {standings.length === 0 ? (
        <div className="notice notice-info">Noch keine Gruppendaten vorhanden.</div>
      ) : (
        <div className="standings-grid">
          {standings.map((g) => (
            <section key={g.group} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="group-head" style={{ margin: 0, padding: '14px 16px' }}>
                <h3 style={{ fontSize: 18 }}>Gruppe {g.group}</h3>
              </div>
              <table className="table" style={{ border: 'none', borderRadius: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: 24 }}></th>
                    <th>Team</th>
                    <th className="num" title="Spiele">Sp</th>
                    <th className="num" title="Tordifferenz">Diff</th>
                    <th className="num" title="Punkte">Pkt</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r, i) => (
                    <tr key={r.team} className={i < 2 ? 'qualifies' : ''}>
                      <td className="rank">{i + 1}</td>
                      <td>
                        {r.team}
                        <div className="caption">
                          {r.won}S · {r.drawn}U · {r.lost}N · {r.gf}:{r.ga}
                        </div>
                      </td>
                      <td className="num">{r.played}</td>
                      <td className="num">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                      <td className="num" style={{ fontWeight: 600, color: 'var(--ek-ink)' }}>
                        {r.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
