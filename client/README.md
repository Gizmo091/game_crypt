# Coded Words - Client

Application frontend Vue.js 3 pour le jeu Coded Words.

## Technologies

- Vue.js 3 avec Composition API (`<script setup>`)
- Vue Router pour la navigation
- Pinia pour la gestion d'état
- Socket.io-client pour la communication temps réel
- Vite pour le bundling

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

L'application démarre sur `http://localhost:5173`

## Production

### Build

```bash
npm run build
```

### Preview du build

```bash
npm run preview
```

## Structure

```
src/
├── components/          # Composants Vue réutilisables
│   ├── CreateRoom.vue   # Modal de création de salon
│   ├── PlayerList.vue   # Liste des joueurs
│   ├── RoomList.vue     # Liste des salons
│   ├── ScoreBoard.vue   # Tableau des scores
│   └── Timer.vue        # Minuteur de manche
├── composables/
│   └── useSocket.js     # Composable Socket.io (connexion, événements)
├── stores/
│   └── gameStore.js     # Store Pinia (état global du jeu)
├── views/
│   ├── HomeView.vue     # Page d'accueil (liste des salons)
│   ├── LobbyView.vue    # Salle d'attente avant partie
│   └── GameView.vue     # Vue de jeu en cours
├── router/
│   └── index.js         # Configuration des routes
├── App.vue              # Composant racine
├── main.js              # Point d'entrée
└── style.css            # Styles globaux
```

## Configuration

Variables d'environnement (fichier `.env`) :

```env
# URL du serveur WebSocket
VITE_SERVER_URL=http://localhost:4174
```

## Docker

```bash
docker compose up -d
```

Le client sera accessible sur le port 4173.

### Variables Docker

```env
VITE_SERVER_URL=http://votre-serveur:4174
VITE_PORT=4173
VITE_ALLOWED_HOST=localhost
```
