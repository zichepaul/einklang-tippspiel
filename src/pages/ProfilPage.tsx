// Mein Profil – Spitzname setzen, eigene Tipp-Historie und Punkte.

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { MatchDto, MeDto } from '../lib/types';
import { formatKickoff, stageLabel } from '../lib/format';
import { useToast } from '../components/Toast';

export function ProfilPage({ me }: { me: MeDto }) {
  const toast = useToast();
  const [nickname, setNickname] = useState(me.nickname ?? '');
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<MatchDto[] | null>(null);

  useEffect(() => {
    api.getMatches().then((d) => setMatches(d.matches)).catch(() => setMatches([]));
  }, []);

  const history = useMemo(
    () =>
      (matches ?? [])
        .filter((m) => m.myPrediction)
        .sort((a, b) => b.kickoffUtc.localeCompare(a.kickoffUtc)),
    [matches],
  );

  const totals = useMemo(() => {
    let points = 0;
    let scored = 0;
    for (const m of history) {
      if (m.myPrediction?.points != null) {
        points += m.myPrediction.points;
        scored++;
      }
    }
    return { points, scored, tips: history.length };
  }, [history]);

  async function saveNickname() {
    setSaving(true);
    try {
      const updated = await api.updateNickname(nickname.trim());
      toast('Spitzname gespeichert.', 'success');
      setNickname(updated.nickname ?? '');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Speichern fehlgeschlagen.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Mein Profil</h1>
        <p>
          Angemeldet als <strong>{me.displayName}</strong> ({me.email}).
        </p>
      </div>

      <div className="card-gradient" style={{ maxWidth: 520, marginBottom: 24 }}>
        <label className="field" htmlFor="nick">
          Spitzname für die Rangliste
        </label>
        <input
          id="nick"
          className="input"
          placeholder={me.displayName}
          maxLength={40}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <p className="caption" style={{ marginBottom: 16 }}>
          Ohne Spitzname wird Ihr echter Name angezeigt.
        </p>
        <button className="btn btn-primary" disabled={saving} onClick={saveNickname}>
          {saving ? 'Speichert…' : 'Spitzname speichern'}
        </button>
      </div>

      <div className="row wrap" style={{ gap: 16, marginBottom: 24 }}>
        <Stat label="Abgegebene Tipps" value={totals.tips} />
        <Stat label="Gewertete Spiele" value={totals.scored} />
        <Stat label="Punkte aus Spieltipps" value={totals.points} />
      </div>

      <h3 style={{ marginBottom: 12 }}>Tipp-Historie</h3>
      {!matches ? (
        <div className="spinner" aria-label="Lädt" />
      ) : history.length === 0 ? (
        <div className="notice notice-info">Noch keine Tipps abgegeben.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Partie</th>
              <th className="num">Tipp</th>
              <th className="num">Ergebnis</th>
              <th className="num">Punkte</th>
            </tr>
          </thead>
          <tbody>
            {history.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.homeTeam} – {m.awayTeam}
                  <div className="caption">
                    {stageLabel(m.stage, m.group)} · {formatKickoff(m.kickoffUtc)}
                  </div>
                </td>
                <td className="num">
                  {m.myPrediction!.predHome}:{m.myPrediction!.predAway}
                </td>
                <td className="num">
                  {m.resultHome != null ? `${m.resultHome}:${m.resultAway}` : '–'}
                </td>
                <td className="num">
                  {m.myPrediction!.points != null ? `+${m.myPrediction!.points}` : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card" style={{ flex: '1 1 140px', minWidth: 140 }}>
      <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--ek-ink)' }}>{value}</div>
      <div className="caption">{label}</div>
    </div>
  );
}
