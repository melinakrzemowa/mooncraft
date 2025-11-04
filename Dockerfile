# Build stage - includes all build tools and dependencies
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies (including devDependencies for building)
RUN yarn install --frozen-lockfile

# Copy source code and configuration files
COPY tsconfig.json webpack.config.js index.d.ts ./
COPY src ./src

# Build the application
RUN yarn build

# Production stage - lightweight image with only static files
FROM nginx:alpine

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration (optional - nginx defaults work fine for SPA)
# For a single-page application, we might want to add a fallback to index.html
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

