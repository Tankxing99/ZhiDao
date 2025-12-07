FROM node:18-alpine
WORKDIR /app
# 使用中国区镜像源以提升依赖下载成功率
RUN npm config set registry https://registry.npmmirror.com
# 注意：构建上下文为仓库根目录，Dockerfile 位于 server/zhidao-api 下
# 先仅复制包管理文件以利用缓存
COPY server/zhidao-api/package*.json ./
RUN npm ci --omit=dev || npm i --omit=dev
# 再复制业务代码
COPY server/zhidao-api/. .
ENV PORT=8000
EXPOSE 8000
# 兼容平台默认入口，提供 /opt/application/run.sh 启动脚本
RUN mkdir -p /opt/application \
  && printf '#!/bin/sh\nset -eu\ncd /app\nexec npm start\n' > /opt/application/run.sh \
  && chmod +x /opt/application/run.sh
CMD ["npm","start"]

