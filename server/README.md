# Coded Words - Server

Serveur backend Node.js pour le jeu Coded Words.

## Technologies

- Node.js 20+
- Express
- Socket.io pour la communication temps réel
- dotenv pour la configuration

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:4174`

## Production

```bash
npm start
```

## Structure

```
server/
├── data/
│   └── phrases.json       # Dictionnaire des phrases (FR/EN)
├── index.js               # Point d'entrée, configuration Express/Socket.io
├── socketHandlers.js      # Gestion des événements Socket.io
├── roomManager.js         # Gestion des salons (création, join, leave)
├── gameManager.js         # Logique de jeu (rounds, points, timer)
├── statsManager.js        # Statistiques en temps réel
├── phrasesUpdater.js      # Mise à jour automatique des phrases
└── docker-compose.yml     # Configuration Docker
```

## Configuration

Variables d'environnement (fichier `.env`) :

```env
# Port du serveur
PORT=4174

# Mode (development ou production)
NODE_ENV=production

# Origines CORS autorisées (séparées par des virgules)
CORS_ORIGINS=http://localhost:5173,http://localhost:4173

# URL du repo GitHub (pour la mise à jour des phrases)
GITHUB_REPO_URL=https://github.com/Gizmo091/game_crypt
```

## Événements Socket.io

### Client → Serveur

| Événement | Description |
|-----------|-------------|
| `room:create` | Créer un nouveau salon |
| `room:join` | Rejoindre un salon existant |
| `room:rejoin` | Reconnecter à un salon après déconnexion |
| `room:leave` | Quitter un salon |
| `room:list` | Demander la liste des salons |
| `game:start` | Démarrer la partie (manager uniquement) |
| `game:validate-point` | Valider un point pour le devineur |
| `game:skip` | Passer la manche en cours |
| `game:next-round` | Lancer la manche suivante |
| `game:end` | Terminer la partie |

### Serveur → Client

| Événement | Description |
|-----------|-------------|
| `room:joined` | Confirmation de l'entrée dans un salon |
| `room:rejoined` | Confirmation de reconnexion |
| `room:rejoin-failed` | Échec de reconnexion |
| `room:player-joined` | Un joueur a rejoint le salon |
| `room:player-left` | Un joueur a quitté le salon |
| `room:manager-changed` | Le manager a changé |
| `room:list-update` | Mise à jour de la liste des salons |
| `room:error` | Erreur liée au salon |
| `game:started` | La partie a démarré |
| `game:round` | Nouvelle manche (avec phrase) |
| `game:timer` | Mise à jour du timer |
| `game:point-awarded` | Point accordé |
| `game:round-end` | Fin de manche |
| `game:ended` | Fin de partie |
| `stats:update` | Mise à jour des statistiques |

## Docker

```bash
docker compose up -d
```

Le serveur sera accessible sur le port 4174.

### Variables Docker

```env
SERVER_PORT=4174
CORS_ORIGINS=http://localhost:4173
GITHUB_REPO_URL=https://github.com/Gizmo091/game_crypt
```

## Ajouter des phrases

Éditez le fichier `data/phrases.json` :

```json
{
  "fr": [
    {
      "original": "Les petits cailloux",
      "coded": "Lait petit quai sous haie"
    }
  ],
  "en": [
    {
      "original": "Ice cream",
      "coded": "Eyes scream"
    }
  ]
}
```

En production, les phrases sont automatiquement mises à jour depuis GitHub toutes les heures.
