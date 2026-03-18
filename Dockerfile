FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

COPY package*.json ./
COPY src/ ./src/

RUN npm ci --omit=dev

VOLUME /app/output
VOLUME /app/scripts

ENV OUTPUT_DIR=/app/output

ENTRYPOINT ["node", "src/cli.js"]
CMD ["./main.yml"]
