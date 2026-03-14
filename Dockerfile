FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

# Expose port (Cloud Run uses $PORT env var)
EXPOSE $PORT

# Health check script
RUN echo '#!/bin/sh\nexec nc -z localhost ${PORT} || exit 1' > healthcheck.sh && chmod +x healthcheck.sh

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ./healthcheck.sh || exit 1

USER node

CMD ["npm", "start"]
