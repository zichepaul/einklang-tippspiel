// Tippen – Liste der kommenden, noch offenen Spiele, gruppiert nach Spieltag.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { MatchDto } from '../lib/types';
import { dayKey, stageLabel } from '../lib/format';
import { MatchCard } from '../components/MatchCard';

export function TippenPage() {
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMatches()
      .then((d) => setMatches(d.matches))
      .catch((e) => setError(e.message));
  }, []);

  const upcoming = useMemo(
    () => (matches ?? []).filter((m) => !m.locked),
    [matches],
  );

  // Nach Tag gruppieren (chronologisch).
  const groups = useMemo(() => {
    const map = new Map<string, MatchDto[]>();
    for (const m of upcoming) {
      const key = dayKey(m.kickoffUtc);
      (map.get(key) ?? map.set(key, []).get(key)!).push(m);
    }
    return [...map.entries()];
  }, [upcoming]);

  function onSaved(matchId: string, h: number, a: number) {
    setMatches((prev) =>
      prev
        ? prev.map((m) =>
            m.id === matchId
              ? { ...m, myPrediction: { predHome: h, predAway: a, points: null } }
              : m,
          )
        : prev,
    );
  }

  if (error) return <div className="notice notice-error">{error}</div>;
  if (!matches) return <div className="spinner" aria-label="Lädt" />;

  return (
    <>
      <div className="page-head">
        <h1>Tippen</h1>
        <p>
          Geben Sie Ihre Ergebnistipps ab – jederzeit änderbar bis zum Anpfiff der jeweiligen
          Partie. Den Weltmeister tippen Sie{' '}
          <Link to="/weltmeister">auf der eigenen Seite</Link>.
        </p>
      </div>

      {upcoming.length === 0 ? (
        <div className="notice notice-info">
          Aktuell sind keine offenen Spiele verfügbar. Sobald der Spielplan geladen ist bzw. neue
          Partien anstehen, erscheinen sie hier.
        </div>
      ) : (
        groups.map(([day, ms]) => (
          <section key={day}>
            <div className="group-head">
              <h3 style={{ textTransform: 'capitalize' }}>{day}</h3>
              <span className="line" />
              <span className="caption">{stageLabel(ms[0].stage, ms[0].group)}</span>
            </div>
            <div className="stack">
              {ms.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  mode="edit"
                  onSaved={(h, a) => onSaved(m.id, h, a)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
