FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY index.html ./index.html
COPY postcss.config.js ./postcss.config.js
COPY tailwind.config.ts ./tailwind.config.ts
COPY tsconfig.json ./tsconfig.json
COPY vite.config.ts ./vite.config.ts
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
