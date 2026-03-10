FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Accept build argument for backend URL
ARG VITE_BACKEND_URL=http://localhost:3011
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Build the app
RUN npm run build

# Expose port
EXPOSE 3010

# Start the preview server
CMD ["npm", "run", "preview"]