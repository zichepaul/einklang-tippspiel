// Weltmeister-Tipp – Auswahl des Weltmeisters, abgebbar bis zum Anpfiff des
// Eröffnungsspiels. Danach read-only.

import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { ChampionDto } from '../lib/types';
import { formatKickoff, countdown } from '../lib/format';
import { useToast } from '../components/Toast';

export function WeltmeisterPage() {
  const toast = useToast();
  const [data, setData] = useState<ChampionDto | null>(null);
  const [pick, setPick] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getChampion()
      .then((d) => {
        setData(d);
        setPick(d.championTeam ?? '');
      })
      .catch((e) => setError(e.message));
  }, []);

  async function save() {
    if (!pick) {
      toast('Bitte ein Team auswählen.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.saveChampion(pick);
      toast('Weltmeister-Tipp gespeichert.', 'success');
      setData((d) => (d ? { ...d, championTeam: pick } : d));
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Speichern fehlgeschlagen.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <div className="notice notice-error">{error}</div>;
  if (!data) return <div className="spinner" aria-label="Lädt" />;

  return (
    <>
      <div className="page-head">
        <h1>Weltmeister-Tipp</h1>
        <p>
          Tippen Sie den Weltmeister 2026 und sichern Sie sich {data.championBetPoints} Punkte bei
          korrektem Tipp.
        </p>
      </div>

      <div className="card-gradient" style={{ maxWidth: 520 }}>
        {data.locked ? (
          <>
            <div className="notice notice-warn" style={{ marginBottom: 16 }}>
              Die Weltmeister-Wette ist seit dem Anpfiff des Eröffnungsspiels gesperrt.
            </div>
            <h4 style={{ marginBottom: 8 }}>Ihr Tipp</h4>
            <p style={{ fontSize: 20, color: 'var(--ek-ink)', fontWeight: 600 }}>
              {data.championTeam ?? 'Kein Tipp abgegeben'}
            </p>
            {data.points != null && (
              <p className="points-pill" style={{ marginTop: 8 }}>
                Erzielt: +{data.points} Punkte
              </p>
            )}
          </>
        ) : (
          <>
            <div className="notice notice-info" style={{ marginBottom: 20 }}>
              Abgabe/Änderung möglich bis zum Anpfiff des Eröffnungsspiels:{' '}
              <strong>{formatKickoff(data.tournamentStartUtc)}</strong> (
              {countdown(data.tournamentStartUtc)}).
            </div>

            <label className="field" htmlFor="champion">
              Ihr Weltmeister
            </label>
            <select
              id="champion"
              className="input"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              style={{ marginBottom: 20 }}
            >
              <option value="">– Team auswählen –</option>
              {data.teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {data.teams.length === 0 && (
              <p className="caption" style={{ marginBottom: 16 }}>
                Die Teamliste wird verfügbar, sobald der Spielplan geladen ist.
              </p>
            )}

            <button className="btn btn-warm" disabled={saving || !pick} onClick={save}>
              {saving ? 'Speichert…' : 'Weltmeister-Tipp speichern'}
            </button>
          </>
        )}
      </div>
    </>
  );
}
