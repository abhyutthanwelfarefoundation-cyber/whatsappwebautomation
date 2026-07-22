FROM node:18-alpine
WORKDIR /usr/src/app
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/. .
RUN mkdir -p logs uploads
EXPOSE 5000
CMD ["node", "src/server.js"]