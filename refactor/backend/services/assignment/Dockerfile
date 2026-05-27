FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN echo "network-timeout=3600000" > .npmrc && npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
