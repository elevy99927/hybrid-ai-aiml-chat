FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN npm install express cors xml2js

# Copy server file
COPY src/backend/simple-server.js .

# Copy patterns file  
COPY simple-patterns.xml .

EXPOSE 3001

CMD ["node", "simple-server.js"]