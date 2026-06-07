// Admin-Bereich (nur isAdmin): Ergebnis manuell überschreiben, Sync auslösen,
// Nutzer-/Admin-Verwaltung, Regel-/Punkte-Konfiguration einsehen.

import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { AdminUserRow, ConfigDto, MatchDto } from '../lib/types';
import { formatKickoff, stageLabel } from '../lib/format';
import { useToast } from '../components/Toast';

export function AdminPage() {
  return (
    <>
      <div className="page-head">
        <h1>Admin-Bereich</h1>
        <p>Ergebnisse nachtragen, Spielplan synchronisieren und Teilnehmer verwalten.</p>
      </div>
      <div className="stack" style={{ gap: 24 }}>
        <SyncSection />
        <ResultSection />
        <UsersSection />
        <ConfigSection />
      </div>
    </>
  );
}

// --- Sync -----------------------------------------------------------------

function SyncSection() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function sync() {
    setBusy(true);
    try {
      const r = await api.adminSync();
      toast(
        `Sync ok: ${r.fetched} geladen, ${r.newlyFinished} neu beendet, ${r.predictionsScored} Tipps gewertet.`,
        'success',
      );
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Sync fehlgeschlagen.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h3 style={{ marginBottom: 8 }}>Spielplan-Sync</h3>
      <p style={{ marginBottom: 16 }}>
        Lädt Spielplan und Ergebnisse von der Fußball-API und berechnet betroffene Tipps neu (läuft
        zusätzlich automatisch per Timer).
      </p>
      <button className="btn btn-primary" disabled={busy} onClick={sync}>
        {busy ? 'Synchronisiert…' : 'Jetzt synchronisieren'}
      </button>
    </section>
  );
}

// --- Ergebnis überschreiben ----------------------------------------------

function ResultSection() {
  const toast = useToast();
  const [matches, setMatches] = useState<MatchDto[]>([]);
  const [sel, setSel] = useState('');
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [champion, setChampion] = useState('');
  const [busy, setBusy] = useState(false);

  function reload() {
    api.getMatches().then((d) => setMatches(d.matches));
  }
  useEffect(reload, []);

  const selected = matches.find((m) => m.id === sel);

  function onSelect(id: string) {
    setSel(id);
    const m = matches.find((x) => x.id === id);
    setHome(m?.resultHome != null ? String(m.resultHome) : '');
    setAway(m?.resultAway != null ? String(m.resultAway) : '');
  }

  async function save() {
    if (!sel || home === '' || away === '') {
      toast('Bitte Spiel und beide Tore angeben.', 'error');
      return;
    }
    setBusy(true);
    try {
      const r = await api.adminSetResult(
        sel,
        Number(home),
        Number(away),
        selected?.stage === 'final' ? champion.trim() || undefined : undefined,
      );
      toast(`Ergebnis gesetzt. ${r.predictionsScored} Tipps neu gewertet.`, 'success');
      reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Speichern fehlgeschlagen.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h3 style={{ marginBottom: 8 }}>Ergebnis manuell setzen / überschreiben</h3>
      <p style={{ marginBottom: 16 }}>
        Fallback bei verzögerter oder fehlerhafter API. Es zählt das Ergebnis nach 90 Minuten. Die
        Eingabe löst dieselbe Punkteberechnung aus wie der Sync.
      </p>

      <label className="field" htmlFor="match">
        Spiel
      </label>
      <select id="match" className="input" value={sel} onChange={(e) => onSelect(e.target.value)} style={{ marginBottom: 16 }}>
        <option value="">– Spiel auswählen –</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            {stageLabel(m.stage, m.group)} · {m.homeTeam} – {m.awayTeam} · {formatKickoff(m.kickoffUtc)}
          </option>
        ))}
      </select>

      {selected && (
        <>
          <div className="row" style={{ gap: 12, marginBottom: 16 }}>
            <span className="team">{selected.homeTeam}</span>
            <input className="goal-input" inputMode="numeric" value={home} onChange={(e) => setHome(e.target.value.replace(/\D/g, '').slice(0, 2))} />
            <span className="sep">:</span>
            <input className="goal-input" inputMode="numeric" value={away} onChange={(e) => setAway(e.target.value.replace(/\D/g, '').slice(0, 2))} />
            <span className="team">{selected.awayTeam}</span>
          </div>

          {selected.stage === 'final' && (
            <>
              <label className="field" htmlFor="champ">
                Weltmeister (bei Sieg n. Verlängerung/Elfmeter manuell bestätigen)
              </label>
              <select id="champ" className="input" value={champion} onChange={(e) => setChampion(e.target.value)} style={{ marginBottom: 16 }}>
                <option value="">– automatisch aus 90-Min-Ergebnis –</option>
                <option value={selected.homeTeam}>{selected.homeTeam}</option>
                <option value={selected.awayTeam}>{selected.awayTeam}</option>
              </select>
            </>
          )}

          <button className="btn btn-primary" disabled={busy} onClick={save}>
            {busy ? 'Speichert…' : 'Ergebnis speichern & werten'}
          </button>
        </>
      )}
    </section>
  );
}

// --- Nutzerverwaltung -----------------------------------------------------

function UsersSection() {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [protectedAdmins, setProtectedAdmins] = useState<string[]>([]);
  const [newAdmin, setNewAdmin] = useState('');

  function reload() {
    api.adminGetUsers().then((d) => {
      setUsers(d.users);
      setProtectedAdmins(d.protectedAdmins);
    });
  }
  useEffect(reload, []);

  async function setAdmin(email: string, isAdmin: boolean) {
    try {
      await api.adminSetAdmin(email, isAdmin);
      toast(`${email} ist ${isAdmin ? 'jetzt Admin' : 'kein Admin mehr'}.`, 'success');
      reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Fehlgeschlagen.', 'error');
    }
  }

  async function addAdmin() {
    const email = newAdmin.trim().toLowerCase();
    if (!email) return;
    await setAdmin(email, true);
    setNewAdmin('');
  }

  return (
    <section className="card">
      <h3 style={{ marginBottom: 8 }}>Nutzer- & Admin-Verwaltung</h3>
      <p style={{ marginBottom: 16 }}>
        Admin-Rechte per E-Mail vergeben. Stamm-Admins (über App-Settings) sind geschützt.
      </p>

      <div className="row wrap" style={{ marginBottom: 16 }}>
        <input
          className="input"
          style={{ maxWidth: 320 }}
          placeholder="name@einklang-energy.de"
          value={newAdmin}
          onChange={(e) => setNewAdmin(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" onClick={addAdmin}>
          Als Admin hinzufügen
        </button>
      </div>

      {users.length === 0 ? (
        <div className="notice notice-info">Noch keine angemeldeten Nutzer.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>E-Mail</th>
              <th>Rolle</th>
              <th className="num">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isProtected = protectedAdmins.includes(u.email.toLowerCase());
              return (
                <tr key={u.id}>
                  <td>{u.nickname || u.displayName}</td>
                  <td className="caption">{u.email}</td>
                  <td>
                    {u.isAdmin ? (
                      <span className="badge badge-deepflow">Admin</span>
                    ) : (
                      <span className="badge badge-locked">Teilnehmer</span>
                    )}
                  </td>
                  <td className="num">
                    {isProtected ? (
                      <span className="caption">geschützt</span>
                    ) : u.isAdmin ? (
                      <button className="btn btn-outline btn-sm" onClick={() => setAdmin(u.email, false)}>
                        Admin entfernen
                      </button>
                    ) : (
                      <button className="btn btn-outline btn-sm" onClick={() => setAdmin(u.email, true)}>
                        Zum Admin
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

// --- Konfiguration --------------------------------------------------------

function ConfigSection() {
  const [config, setConfig] = useState<(ConfigDto & { adminEmails: string[] }) | null>(null);

  useEffect(() => {
    api.adminGetConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  if (!config) return null;

  return (
    <section className="card">
      <h3 style={{ marginBottom: 8 }}>Regel- & Punkte-Konfiguration</h3>
      <table className="table" style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <td>Anpfiff Eröffnungsspiel (Deadline WM-Tipp)</td>
            <td className="num">{formatKickoff(config.tournamentStartUtc)}</td>
          </tr>
          <tr>
            <td>Exaktes Ergebnis</td>
            <td className="num">{config.pointRules.exact} Punkte</td>
          </tr>
          <tr>
            <td>Richtige Tordifferenz</td>
            <td className="num">{config.pointRules.goalDiff} Punkte</td>
          </tr>
          <tr>
            <td>Richtige Tendenz</td>
            <td className="num">{config.pointRules.tendency} Punkte</td>
          </tr>
          <tr>
            <td>Weltmeister-Wette</td>
            <td className="num">{config.championBetPoints} Punkte</td>
          </tr>
          <tr>
            <td>Admins</td>
            <td className="num">{config.adminEmails.join(', ') || '–'}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
