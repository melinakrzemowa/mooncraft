# Self-contained build with simple HTTP server
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code and configuration files
COPY tsconfig.json webpack.config.js index.d.ts ./
COPY src ./src

# Build the application
RUN yarn build

# Install serve globally for serving static files
RUN npm install -g serve

# Expose port 3000
EXPOSE 3000

# Serve the dist folder
CMD ["serve", "-s", "dist", "-l", "3000"]

