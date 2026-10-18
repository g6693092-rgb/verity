FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile=false

COPY . .
RUN pnpm typecheck

EXPOSE 3000
CMD ["pnpm", "start"]
