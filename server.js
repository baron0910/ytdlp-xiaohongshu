const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// 將 exec 轉換為 Promise 版本
const execPromise = promisify(exec);

const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;

// API Key 驗證中間件
const authenticate = (req, res, next) => {
  if (API_KEY) {
    const userKey = req.headers['authorization'];
    if (!userKey || userKey !== API_KEY) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: Invalid or missing API Key' 
      });
    }
  }
  next();
};

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'ytdlp-xiaohongshu',
    timestamp: new Date().toISOString(),
    authEnabled: !!API_KEY
  });
});

// 下載並轉換端點
app.post('/download', authenticate, async (req, res) => {
  const { mediaUrl } = req.body;
  
  if (!mediaUrl) {
    return res.status(400).json({
      success: false,
      error: 'mediaUrl is required'
    });
  }
  
  const jobId = `xhs_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const tempFile = path.join('/tmp', `${jobId}.mp4`);
  
  try {
    console.log(`[${jobId}] 開始處理: ${mediaUrl}`);
    
    // 1. 下載影片 (非同步)
    console.log(`[${jobId}] 步驟 1: 下載影片...`);
    const ytDlpCmd = `yt-dlp -f "bestaudio/worst" --no-playlist --no-continue --no-cache-dir --socket-timeout 60 --retries 3 --fragment-retries 3 --user-agent "Xiaohongshu/8.99.1 (iPhone; iOS 16.0; Scale/3.00)" --add-header "Referer: https://www.xiaohongshu.com/" -o "${tempFile}" "${mediaUrl}"`;
    
    await execPromise(ytDlpCmd, { timeout: 300000 });
    
    if (!fs.existsSync(tempFile)) {
      throw new Error('下載失敗：檔案未能在預期路徑生成');
    }
    
    // 2. 獲取時長 (非同步)
    console.log(`[${jobId}] 步驟 2: 獲取時長...`);
    const { stdout: duration } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFile}"`, { timeout: 10000 });
    
    // 3. 轉換為 base64 (非同步)
    console.log(`[${jobId}] 步驟 3: 轉換為 base64...`);
    const ffmpegCmd = `ffmpeg -v error -i "${tempFile}" -vn -ac 1 -ar 16000 -acodec pcm_s16le -f wav - 2>/dev/null | base64 | tr -d '\\n\\r '`;
    const { stdout: base64Audio } = await execPromise(ffmpegCmd, { 
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024 // 允許最大 50MB 的輸出
    });
    
    // 清理
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    
    console.log(`[${jobId}] 處理完成`);
    
    res.json({
      success: true,
      jobId: jobId,
      duration: parseFloat(duration.trim()),
      audioBase64: base64Audio.trim()
    });
  } catch (error) {
    console.error(`[${jobId}] 處理失敗:`, error.message);
    
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
    
    res.status(500).json({
      success: false,
      jobId: jobId,
      error: error.message
    });
  }
});

// 根路徑
app.get('/', (req, res) => {
  res.json({
    service: 'ytdlp-xiaohongshu',
    version: '1.3.1',
    authEnabled: !!API_KEY,
    github: 'https://github.com/baron0910/ytdlp-xiaohongshu'
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ytdlp-xiaohongshu 服務運行在端口 ${PORT}`);
  if (API_KEY) console.log('API Key 驗證已啟用');
});
