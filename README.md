# ytdlp-xiaohongshu

yt-dlp API 服務，用於下載小紅書影片並轉換為 base64 音訊。

## 功能

- ✅ 下載小紅書影片
- ✅ 轉換為 base64 音訊（16kHz, mono, PCM）
- ✅ RESTful API 接口
- ✅ 健康檢查端點

## API 端點

### GET /health
健康檢查

```bash
curl http://localhost:3000/health
```

### POST /download
下載並轉換影片

```bash
curl -X POST http://localhost:3000/download \
  -H "Content-Type: application/json" \
  -d '{"mediaUrl": "https://sns-video-*.xhscdn.com/xxx.mp4"}'
```

**響應格式**：
```json
{
  "success": true,
  "duration": 30.5,
  "audioBase64": "UklGRiQAAABXQVZFZm10..."
}
```

## 部署

### Zeabur 部署

1. 推送到 GitHub
2. 在 Zeabur 連接 GitHub 倉庫
3. 選擇部署區域（建議：日本/新加坡/香港）
4. Zeabur 會自動構建並部署

### 本地測試

```bash
# 安裝依賴
npm install

# 啟動服務
npm start

# 測試
curl http://localhost:3000/health
```

## 環境變數

- `PORT`: 服務端口（預設: 3000）
- `NODE_ENV`: 環境模式（production/development）

## 技術棧

- Node.js 24
- Express.js
- yt-dlp
- ffmpeg

