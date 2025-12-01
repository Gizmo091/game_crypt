# Coded Words

Un jeu multijoueur en temps réel où les joueurs doivent deviner des phrases à partir de leur prononciation codée.

## Le concept

Le devineur voit une phrase codée (ex: "Lait petit quai sous haie") et doit la prononcer à voix haute. Les autres joueurs entendent cette phrase et connaissent la réponse originale (ex: "Les petits cailloux"). Ils doivent aider le devineur en mimant, dessinant ou donnant des indices - sans prononcer les mots de la réponse !

## Architecture

Le projet est composé de deux parties :

- **client/** - Application Vue.js 3 (frontend)
- **server/** - Serveur Node.js avec Socket.io (backend)

## Prérequis

- Node.js 20+
- npm

## Installation locale

### 1. Cloner le projet

```bash
git clone https://github.com/Gizmo091/game_crypt.git
cd game_crypt
```

### 2. Installer et lancer le serveur

```bash
cd server
npm install
npm start
```

Le serveur démarre sur `http://localhost:4174`

### 3. Installer et lancer le client

Dans un autre terminal :

```bash
cd client
npm install
npm run dev
```

Le client démarre sur `http://localhost:5173`

## Déploiement avec Docker

### Tout-en-un (client + serveur)

```bash
docker compose up -d
```

Cela lance :
- Le serveur sur le port 4174
- Le client sur le port 4173

### Variables d'environnement

Créez un fichier `.env` pour personnaliser la configuration :

```env
# URL du repo Git (pour les mises à jour des phrases)
REPO_URL=https://github.com/Gizmo091/game_crypt.git
BRANCH=main

# Configuration serveur
SERVER_PORT=4174
CORS_ORIGINS=http://localhost:4173,https://mondomaine.com

# Configuration client
VITE_SERVER_URL=http://localhost:4174
VITE_PORT=4173
VITE_ALLOWED_HOST=localhost
```

### Déploiement séparé

Vous pouvez aussi déployer client et serveur séparément :

```bash
# Serveur uniquement
cd server
docker compose up -d

# Client uniquement
cd client
docker compose up -d
```

## Structure du projet

```
game_crypt/
├── client/                 # Application Vue.js
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── composables/    # Logique réutilisable (useSocket)
│   │   ├── stores/         # Store Pinia
│   │   └── views/          # Pages de l'application
│   └── docker-compose.yml
├── server/                 # Serveur Node.js
│   ├── data/
│   │   └── phrases.json    # Dictionnaire des phrases
│   ├── index.js            # Point d'entrée
│   ├── socketHandlers.js   # Gestion des événements Socket.io
│   ├── roomManager.js      # Gestion des salons
│   ├── gameManager.js      # Logique de jeu
│   └── docker-compose.yml
└── docker-compose.yml      # Déploiement combiné
```

## Fonctionnalités

- Création de salons avec ou sans mot de passe
- Support multilingue (FR/EN)
- Temps de manche configurable
- Rotation automatique des devineurs
- Système de points
- Reconnexion automatique en cas de déconnexion
- Mise à jour automatique des phrases depuis GitHub

## Technologies

- **Frontend** : Vue.js 3, Vue Router, Pinia, Socket.io-client
- **Backend** : Node.js, Express, Socket.io
- **Déploiement** : Docker, Docker Compose

## Licence

MIT
