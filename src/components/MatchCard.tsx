// Spielkarte – zwei Modi:
//   mode="edit"  → Tippeingabe für noch nicht gesperrte Spiele
//   mode="view"  → Spielplan-Ansicht mit Ergebnis, eigenem Tipp + Punkten
// Fremde Tipps erscheinen ausklappbar, sobald das Spiel angepfiffen ist.

import { useState } from 'react';
import type { MatchDto } from '../lib/types';
import { formatTime, statusLabel } from '../lib/format';
import { useToast } from './Toast';
import { api, ApiError } from '../lib/api';

interface Props {
  match: MatchDto;
  mode: 'edit' | 'view';
  /** Callback nach erfolgreichem Speichern (für lokale State-Updates). */
  onSaved?: (predHome: number, predAway: number) => void;
}

export function MatchCard({ match, mode, onSaved }: Props) {
  const toast = useToast();
  const [home, setHome] = useState<string>(
    match.myPrediction ? String(match.myPrediction.predHome) : '',
  );
  const [away, setAway] = useState<string>(
    match.myPrediction ? String(match.myPrediction.predAway) : '',
  );
  const [saving, setSaving] = useState(false);
  const [showOthers, setShowOthers] = useState(false);

  const editable = mode === 'edit' && !match.locked;
  const dirty =
    home !== '' &&
    away !== '' &&
    (String(match.myPrediction?.predHome ?? '') !== home ||
      String(match.myPrediction?.predAway ?? '') !== away);

  async function save() {
    const h = Number(home);
    const a = Number(away);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) {
      toast('Bitte ganze Zahlen ≥ 0 eingeben.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.savePrediction(match.id, h, a);
      toast('Tipp gespeichert.', 'success');
      onSaved?.(h, a);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Speichern fehlgeschlagen.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const statusBadge = match.locked ? (
    match.status === 'live' ? (
      <span className="badge badge-live">● Läuft</span>
    ) : match.status === 'finished' ? (
      <span className="badge badge-finished">{statusLabel(match.status)}</span>
    ) : (
      <span className="badge badge-locked">Gesperrt</span>
    )
  ) : (
    <span className="badge badge-soft">Offen</span>
  );

  const hasResult = match.resultHome != null && match.resultAway != null;

  return (
    <div className={`match ${match.locked ? 'is-locked' : ''}`}>
      <div className="match-top">
        <span className="match-time">{formatTime(match.kickoffUtc)}</span>
        {statusBadge}
      </div>

      <div className="match-body">
        <span className="team home">{match.homeTeam}</span>

        {editable ? (
          <div className="score-inputs">
            <input
              className="goal-input"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              aria-label={`Tore ${match.homeTeam}`}
              value={home}
              onChange={(e) => setHome(e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
            <span className="sep">:</span>
            <input
              className="goal-input"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              aria-label={`Tore ${match.awayTeam}`}
              value={away}
              onChange={(e) => setAway(e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
          </div>
        ) : (
          <span className="result-chip">
            {hasResult ? `${match.resultHome} : ${match.resultAway}` : '–  :  –'}
          </span>
        )}

        <span className="team away">{match.awayTeam}</span>
      </div>

      <div className="match-foot">
        <div className="row" style={{ gap: 16 }}>
          {match.myPrediction ? (
            <span className="caption">
              Ihr Tipp: <strong>{match.myPrediction.predHome}:{match.myPrediction.predAway}</strong>
            </span>
          ) : (
            <span className="caption">{editable ? 'Noch kein Tipp' : 'Kein Tipp abgegeben'}</span>
          )}
          {match.myPrediction?.points != null && (
            <span className="points-pill">+{match.myPrediction.points} Pkt</span>
          )}
        </div>

        {editable && (
          <button className="btn btn-primary btn-sm" disabled={!dirty || saving} onClick={save}>
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        )}

        {match.otherPredictions && match.otherPredictions.length > 0 ? (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowOthers((s) => !s)}
            aria-expanded={showOthers}
          >
            {showOthers
              ? 'Tipps ausblenden'
              : `Alle Tipps anzeigen (${match.otherPredictions.length})`}
          </button>
        ) : (
          match.locked &&
          match.status !== 'finished' && (
            <span className="caption">Tipps der anderen sind ab Anpfiff sichtbar</span>
          )
        )}
      </div>

      {showOthers && match.otherPredictions && (
        <div style={{ marginTop: 8 }}>
          <p className="caption" style={{ marginBottom: 4 }}>
            Tipps aller Teilnehmer (seit Anpfiff freigegeben):
          </p>
          <table className="table" style={{ border: 'none' }}>
            <tbody>
              {match.otherPredictions.map((p, i) => {
                const exact =
                  match.status === 'finished' &&
                  p.predHome === match.resultHome &&
                  p.predAway === match.resultAway;
                return (
                  <tr key={i}>
                    <td>{p.name}</td>
                    <td className="num" style={exact ? { fontWeight: 600, color: 'var(--ek-deepflow)' } : undefined}>
                      {p.predHome}:{p.predAway}
                      {exact ? ' ✓' : ''}
                    </td>
                    <td className="num">{p.points != null ? `+${p.points}` : '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
