# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Install deps (yarn for parity with dev environment)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build the production bundle
COPY . .
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN yarn build

# --- Runtime stage: nginx serves the static build ---
FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache curl
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
