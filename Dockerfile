FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Vite bakes VITE_* into the bundle at build time (runtime env in compose is not enough)
ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_AUTH_CALLBACK=http://localhost:5174/auth/callback
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AUTH_CALLBACK=$VITE_AUTH_CALLBACK

RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including vite for preview)
RUN npm ci

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Expose port
EXPOSE 5174

# Set environment variable to disable host check
ENV VITE_HOST_CHECK=false

# Listen on all interfaces so the port mapping works
CMD ["npm", "run", "preview"]
