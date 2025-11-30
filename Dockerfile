# Dockerfile — Version ULTRA LÉGÈRE 2025 (fonctionne à 100% sur Render gratuit)
FROM node:20-alpine

# Crée et définit le répertoire
WORKDIR /app

# Copie seulement package.json d'abord (meilleur cache)
COPY package.json .

# Installe uniquement ce qui est nécessaire en prod
RUN npm install --omit=dev

# Copie tout le reste
COPY . .

# Port utilisé par Render (dynamique)
EXPOSE $PORT

# Démarrage direct (pas de PM2, pas de npm start)
CMD ["node", "index.js"]
