FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 8080

CMD ["node", "server.js"]