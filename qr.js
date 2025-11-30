// qr.js — Version finale 2025 (ESM + QR stable + Render compatible)

import { makeid } from './gen-id.js';
import express from 'express';
import QRCode from 'qrcode';
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

    async function connect() {
        const { state, saveCreds } = await useMultiFileAuthState(`./temp/${id}`);

        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: "silent" }),
            printQRInTerminal: false,
            browser: ["Chrome", "Windows", "10.0"], // QR stable 2025
            connectTimeoutMs: 60_000,
            defaultQueryTimeoutMs: 60_000,
            keepAliveIntervalMs: 30_000
        });

        sock.ev.on('creds.update', saveCreds);

        let qrSent = false;

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // Envoie le QR dès qu'il arrive
            if (qr && !qrSent) {
                qrSent = true;
                try {
                    const qrBuffer = await QRCode.toBuffer(qr, { width: 600 });
                    res.writeHead(200, {
                        'Content-Type': 'image/png',
                        'Content-Length': qrBuffer.length
                    });
                    res.end(qrBuffer);
                } catch (err) {
                    if (!res.headersSent) res.status(500).send("Erreur génération QR");
                }
            }

            if (connection === 'open') {
                try {
                    await delay(5000);
                    const credsPath = `\( {__dirname}/temp/ \){id}/creds.json`;
                    const megaUrl = await upload(fs.createReadStream(credsPath), `${sock.user.id}.json`);
                    const sessionId = megaUrl.replace('https://mega.nz/file/', '');
                    const sessionText = `malvin~${sessionId}`;

                    await sock.sendMessage(sock.user.id, { text: sessionText });

                    const message = `*Hey there, MALVIN-XD User!*  
Your session has been successfully created via QR!  

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
                                title: "ᴍᴀʟᴠɪɴ-xᴅ Connected",
                                thumbnailUrl: "https://files.catbox.moe/bqs70b.jpg",
                                sourceUrl: "https://whatsapp.com/channel/0029VbA6MSYJUM2TVOzCSb2A",
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    });

                    await sock.ws.close();
                    removeFile(`./temp/${id}`);
                    console.log(`QR Session générée: ${sock.user.id}`);
                    process.exit(0);

                } catch (err) {
                    console.error("QR Upload error:", err);
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
    }

    await connect();
});

export default router;
