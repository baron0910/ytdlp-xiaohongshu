# 使用官方 Node.js 映像檔 (建議使用 22-slim 以確保穩定性)
FROM node:22-slim

# 設置工作目錄
WORKDIR /app

# 安裝系統依賴（ffmpeg 需要，python3 是執行 yt-dlp 必要環境）
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 下載最新版的 yt-dlp 並設置執行權限
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝 Node.js 依賴
# 因為專案中沒有 package-lock.json，所以改用 npm install
# 並使用 --omit=dev 取代已過時的 --only=production
RUN npm install --omit=dev

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
