# 1️⃣ Base image
FROM node:20-alpine

# 2️⃣ Set working directory
WORKDIR /app

# 3️⃣ Copy package files
COPY package.json pnpm-lock.yaml ./

# 4️⃣ Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 5️⃣ Copy project files
COPY . .

# 6️⃣ Generate Prisma client
RUN pnpm prisma generate

# 7️⃣ Build NestJS app
RUN pnpm build

# 8️⃣ Expose port
EXPOSE 3000

# 9️⃣ Start application
CMD ["pnpm", "start:prod"]