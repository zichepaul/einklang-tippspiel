// Einstiegspunkt des Azure-Functions-v4-Modells.
// Jeder Import registriert seine Funktion per Seiteneffekt (app.http/app.timer).

import './functions/roles';
import './functions/me';
import './functions/config';
import './functions/matches';
import './functions/predictions';
import './functions/championBet';
import './functions/leaderboard';
import './functions/adminResult';
import './functions/adminSync';
import './functions/adminUsers';
import './functions/adminConfig';
import './functions/syncTimer';
