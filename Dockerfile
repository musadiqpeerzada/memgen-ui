# 1. Base image with Node.js
FROM node:20-alpine AS builder

# 2. Set working directory
WORKDIR /app

# 3. Install dependencies
COPY . .
RUN corepack enable && pnpm install

# 4. Build the Next.js app
RUN pnpm build

# 5. Final production image
FROM node:20-alpine AS runner

# 6. Set environment
ENV NODE_ENV=production
ENV PORT=3000

# 7. Set working directory again
WORKDIR /app

# 8. Copy from builder
COPY --from=builder /app ./

# 9. Install only production dependencies
RUN corepack enable && pnpm install --prod

# 10. Expose port and run
EXPOSE 3000
CMD ["pnpm", "start"]