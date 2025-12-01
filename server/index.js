import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './socketHandlers.js';
import { startPhrasesUpdater } from './phrasesUpdater.js';

const app = express();

// Trust proxy pour fonctionner derrière un reverse proxy (nginx, etc.)
app.set('trust proxy', 1);

const server = createServer(app);

// Configuration CORS - supporte les origines multiples via variable d'environnement
// CORS_ORIGINS peut être une liste séparée par des virgules: "https://example.com,https://www.example.com"
const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : defaultOrigins;

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Configuration pour reverse proxy
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

setupSocketHandlers(io);

// Démarrer la mise à jour automatique des phrases
startPhrasesUpdater();

const PORT = process.env.PORT || 4174;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`CORS origins: ${corsOrigins.join(', ')}`);
});
