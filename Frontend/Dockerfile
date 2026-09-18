### Frontend Dockerfile - multi-stage (build with Node, serve with nginx)
FROM node:18-alpine AS build
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
WORKDIR /app
COPY package.json package-lock.json* ./
COPY src ./src
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json* ./
RUN npm ci --silent && npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
