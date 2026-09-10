FROM node:20-alpine

WORKDIR /app

# Copy dependency definition
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy mock server code
COPY cce-local-mock.cjs ./

EXPOSE 8080
ENV PORT=8080

CMD ["node", "cce-local-mock.cjs"]
