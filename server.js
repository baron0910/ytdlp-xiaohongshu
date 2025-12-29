const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execPromise = promisify(exec);

const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;

const authenticate = (req, res, next) => {
  if (API_KEY) {
    const userKey = req.headers['authorization'];
    if (!userKey || userKey !== API_KEY) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  }
  next();
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', authEnabled: !!API_KEY });
});

app.post('/download', authenticate, async (req, res) => {
  const { mediaUrl } = req.body;
  if (!mediaUrl) return res.status(400).json({ success: false, error: 'mediaUrl is required' });
  
  const jobId = `xhs_${Date.now()}`;
  const tempFile = path.join('/tmp', `${jobId}.mp4`);
  
  try {
    console.log(`[${jobId}] 正在處理: ${mediaUrl}`);
    
    // 1. 下載 (採用您提供的參數)
    // 使用 --socket-timeout 增加穩定性
    const ytDlpCmd = `yt-dlp -f "bestaudio/worst" --no-playlist --no-continue --no-cache-dir --socket-timeout 180 -o "${tempFile}" "${mediaUrl}"`;
    await execPromise(ytDlpCmd, { timeout: 300000 });
    
    // 2. 獲取時長 (採用您提供的參數)
    const { stdout: duration } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFile}"`, { timeout: 15000 });
    
    // 3. 轉檔與輸出 (採用您提供的參數)
    const ffmpegCmd = `ffmpeg -v error -i "${tempFile}" -vn -ac 1 -ar 16000 -acodec pcm_s16le -f wav - 2>/dev/null | base64 | tr -d '\\n\\r '`;
    const { stdout: base64Audio } = await execPromise(ffmpegCmd, { 
      timeout: 180000,
      maxBuffer: 100 * 1024 * 1024 
    });
    
    // 4. 清理
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    
    res.json({
      success: true,
      duration: parseFloat(duration.trim() || 0),
      audioBase64: base64Audio.trim()
    });

  } catch (error) {
    console.error(`[${jobId}] 錯誤:`, error.message);
    if (fs.existsSync(tempFile)) try { fs.unlinkSync(tempFile); } catch (e) {}
    
    res.status(500).json({
      success: false,
      error: error.message.includes('timed out') 
        ? '下載超時，可能是小紅書暫時封鎖了伺服器 IP，請稍後重試。' 
        : error.message
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服務已啟動在 Port ${PORT}`);
});
