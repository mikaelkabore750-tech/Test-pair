// index.js — Version finale 2025 (ESM + Render/Koyeb compatible)

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bodyParser from 'body-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const __path = __dirname;

const app = express();
const PORT = process.env.PORT || 8000;

// Import des routes (elles sont en ESM grâce au pair.js qu’on a corrigé)
import qrRoute from './qr.js';
import pairRoute from './pair.js';

// Augmente la limite d'event listeners (nécessaire avec Baileys)
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 500;

// Routes
app.use('/server', qrRoute);
app.use('/code', pairRoute);

app.get('/pair', (req, res) => {
    res.sendFile(__path + '/pair.html');
});

app.get('/qr', (req, res) => {
    res.sendFile(__path + '/qr.html');
});

app.get('/', (req, res) => {
    res.sendFile(__path + '/main.html');
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Démarrage
app.listen(PORT, "0.0.0.0", () => {
    console.log(`
    MALVIN-XD Session Generator démarré !
    Port : ${PORT}
    URL publique : https://ton-app.onrender.com
    Pairing code : /code?number=226XXXXXXXX
    N'oublie pas la star sur GitHub !
    `);
});
