FROM node:18-alpine
WORKDIR /app
# 使用中国区镜像源以提升依赖下载成功率
RUN npm config set registry https://registry.npmmirror.com
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm i --omit=dev
COPY . .
ENV PORT=8000
EXPOSE 8000
CMD ["npm","start"]

