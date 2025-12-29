# 使用官方 Node.js 映像檔
FROM node:24-slim

# 設置工作目錄
WORKDIR /app

# 安裝系統依賴（ffmpeg 和 yt-dlp 需要）
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安裝 yt-dlp
RUN pip3 install --no-cache-dir yt-dlp

# 複製 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安裝 Node.js 依賴
RUN npm ci --only=production

# 複製應用程式文件
COPY server.js ./

# 設置環境變數
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3000

# 設置非 root 用戶（安全最佳實踐）
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown -R appuser:appuser /app

USER appuser

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 啟動服務
CMD ["node", "server.js"]


