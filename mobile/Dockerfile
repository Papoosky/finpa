FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 8081 19000 19001

# REACT_NATIVE_PACKAGER_HOSTNAME se inyecta desde docker-compose
# para que el QR code apunte a la IP correcta del servidor
CMD ["npx", "expo", "start", "--port", "8081", "--host", "lan"]
