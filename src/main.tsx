import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './i18n/config';
import './index.css';

// ─── Initialisation des Services Réseau ──────────────────────────────────────
// Ces imports forcent l'instanciation des singletons au démarrage.
// Leurs constructeurs enregistrent les listeners sur peerService dès le lancement.
import './services/swarm.service';
import './services/asset-dispatcher.service';
import './services/activity-log.service';
// ──────────────────────────────────────────────────────────────────────────────


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
 <App />
);
