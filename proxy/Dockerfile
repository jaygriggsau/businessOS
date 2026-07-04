FROM node:20-alpine
WORKDIR /app
# No dependencies — the server uses only Node built-ins.
COPY package.json ./
COPY server.js ./
ENV PORT=8787
EXPOSE 8787
CMD ["node", "server.js"]
