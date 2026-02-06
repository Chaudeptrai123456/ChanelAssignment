# ===== Base image =====
FROM node:22-alpine

# ===== Set working directory =====
WORKDIR /app

# ===== Copy package files =====
COPY package*.json ./

# ===== Install dependencies =====
RUN npm install

# ===== Copy source code =====
COPY . .

# ===== Expose HTTP + WebSocket =====
EXPOSE 3000

# ===== Start server =====
CMD ["node", "index.js"]
