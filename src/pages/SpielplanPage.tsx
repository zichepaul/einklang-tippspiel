// Spielplan & Ergebnisse – alle Partien mit Status, 90-Min-Ergebnis, eigenem
// Tipp + Punkten. Fremde Tipps werden ab Anpfiff sichtbar (vom Backend geliefert).

import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { MatchDto, Stage } from '../lib/types';
import { STAGE_LABELS } from '../lib/format';
import { MatchCard } from '../components/MatchCard';

const STAGE_ORDER: Stage[] = [
  'group',
  'round32',
  'round16',
  'quarter',
  'semi',
  'third_place',
  'final',
];

type Filter = 'all' | 'finished' | 'mine';

export function SpielplanPage() {
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    api
      .getMatches()
      .then((d) => setMatches(d.matches))
      .catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    let list = matches ?? [];
    if (filter === 'finished') list = list.filter((m) => m.status === 'finished');
    if (filter === 'mine') list = list.filter((m) => m.myPrediction);
    return list;
  }, [matches, filter]);

  // Gruppieren nach Phase (in Turnierreihenfolge), Gruppenphase zusätzlich nach Gruppe.
  const sections = useMemo(() => {
    const byStage = new Map<string, MatchDto[]>();
    for (const m of filtered) {
      const key = m.stage === 'group' && m.group ? `group:${m.group}` : m.stage;
      const arr = byStage.get(key) ?? [];
      arr.push(m);
      byStage.set(key, arr);
    }
    const keys = [...byStage.keys()].sort((a, b) => {
      const sa = a.startsWith('group:') ? 'group' : a;
      const sb = b.startsWith('group:') ? 'group' : b;
      const d = STAGE_ORDER.indexOf(sa as Stage) - STAGE_ORDER.indexOf(sb as Stage);
      return d !== 0 ? d : a.localeCompare(b);
    });
    return keys.map((k) => ({ key: k, matches: byStage.get(k)! }));
  }, [filtered]);

  if (error) return <div className="notice notice-error">{error}</div>;
  if (!matches) return <div className="spinner" aria-label="Lädt" />;

  return (
    <>
      <div className="page-head">
        <h1>Spielplan & Ergebnisse</h1>
        <p>Alle 104 Partien mit Status, Ergebnis (90 Min) und Ihren erzielten Punkten.</p>
      </div>

      <div className="row wrap" style={{ marginBottom: 8 }}>
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>
          Alle
        </FilterBtn>
        <FilterBtn active={filter === 'mine'} onClick={() => setFilter('mine')}>
          Meine Tipps
        </FilterBtn>
        <FilterBtn active={filter === 'finished'} onClick={() => setFilter('finished')}>
          Beendet
        </FilterBtn>
      </div>

      {sections.length === 0 ? (
        <div className="notice notice-info">Keine Partien für diese Auswahl.</div>
      ) : (
        sections.map((s) => {
          const label = s.key.startsWith('group:')
            ? `Gruppe ${s.key.split(':')[1]}`
            : STAGE_LABELS[s.key as Stage] ?? s.key;
          return (
            <section key={s.key}>
              <div className="group-head">
                <h3>{label}</h3>
                <span className="line" />
              </div>
              <div className="stack">
                {s.matches.map((m) => (
                  <MatchCard key={m.id} match={m} mode="view" />
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={active ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
