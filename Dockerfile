# ===========================================
# Backend NestJS - Multi-stage Build
# ===========================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copia arquivos de configuração primeiro
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Instala TODAS as dependências (incluindo devDependencies para build)
RUN npm ci

# Copia código fonte
COPY src ./src

# Build da aplicação
RUN npm run build

# Verifica se o build foi criado
RUN ls -la dist/ && test -f dist/main.js

# ===========================================
# Stage 2: Production
# ===========================================
FROM node:20-alpine AS production

WORKDIR /app

# Cria usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copia package.json para instalar apenas prod dependencies
COPY package*.json ./

# Instala apenas dependências de produção
RUN npm ci --only=production && npm cache clean --force

# Copia arquivos buildados
COPY --from=builder /app/dist ./dist

# Cria diretório para uploads
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Expõe a porta
EXPOSE 3000

# Muda para usuário não-root
USER nestjs

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Comando de inicialização
CMD ["node", "dist/main.js"]
