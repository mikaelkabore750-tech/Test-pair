// pair.js — Version 100% fonctionnelle sur Render/Koyeb 2025
import { makeid } from './gen-id.js';
import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pino from 'pino';
import {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    DisconnectReason
} from '@whiskeysockets/baileys';
import { upload } from './mega.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

function removeFile(path) {
    if (fs.existsSync(path)) {
        fs.rmSync(path, { recursive: true, force: true });
    }
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number?.replace(/[^0-9]/g, ''); // Nettoyage agressif

    if (!num || num.length < 10) {
        return res.status(400).json({ error: "Numéro invalide" });
    }

    async function connect() {
        const { state, saveCreds } = await useMultiFileAuthState(`./temp/${id}`);

        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: state.keys
            },
            logger: pino({ level: "silent" }),
            printQRInTerminal: false,
            browser: ["Chrome", "Windows", "10.0"], // Fix 2025: Chrome stable
            connectTimeoutMs: 60_000,
            defaultQueryTimeoutMs: 60_000,
            keepAliveIntervalMs: 30_000
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                try {
                    await delay(5000);
                    const credsPath = `\( {__dirname}/temp/ \){id}/creds.json`;
                    const megaUrl = await upload(fs.createReadStream(credsPath), `${sock.user.id}.json`);
                    const sessionId = megaUrl.replace('https://mega.nz/file/', '');
                    const sessionText = `malvin~${sessionId}`;

                    await sock.sendMessage(sock.user.id, { text: sessionText });

                    const message = `*Hey there, MALVIN-XD User!*  
Your session has been successfully created!  

*Session ID:* Sent above  
*Keep it safe!* Do NOT share.

*WhatsApp Channel:*  
https://whatsapp.com/channel/0029VbA6MSYJUM2TVOzCSb2A

*GitHub:*  
https://github.com/XdKing2/MALVIN-XD

*© Powered by Malvin King*`;

                    await sock.sendMessage(sock.user.id, {
                        text: message,
                        contextInfo: {
                            externalAdReply: {
                                title: "ᴍᴀʟᴠɪɴ-xᴅ",
                                thumbnailUrl: "https://files.catbox.moe/bqs70b.jpg",
                                sourceUrl: "https://whatsapp.com/channel/0029VbA6MSYJUM2TVOzCSb2A",
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    });

                    await sock.ws.close();
                    removeFile(`./temp/${id}`);
                    console.log(`Session générée: ${sock.user.id}`);
                    process.exit(0);

                } catch (err) {
                    console.error("Upload/Mega error:", err);
                    await sock.sendMessage(sock.user.id, { text: "Erreur upload session" });
                    process.exit(1);
                }
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    await delay(5000);
                    connect();
                }
            }
        });

        // Attente critique pour stabiliser la connexion avant pairing
        sock.ev.on('connection.update', async (u) => {
            if (u.connection === 'connecting' && !sock.authState.creds.registered) {
                await delay(4000); // Timing magique 2025
                try {
                    const code = await sock.requestPairingCode(num);
                    if (!res.headersSent) {
                        res.json({ code });
                    }
                } catch (e) {
                    if (!res.headersSent) res.status(500).json({ error: "Code invalide, réessaie" });
                }
            }
        });
    }

    await connect();
});

export default router;
