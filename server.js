const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'ytdlp-xiaohongshu',
    timestamp: new Date().toISOString()
  });
});

// 下載並轉換端點
app.post('/download', async (req, res) => {
  const { mediaUrl } = req.body;
  
  if (!mediaUrl) {
    return res.status(400).json({
      success: false,
      error: 'mediaUrl is required'
    });
  }
  
  const tempFile = path.join('/tmp', `xhs_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);
  
  try {
    console.log(`開始處理: ${mediaUrl}`);
    
    // 1. 下載影片
    console.log('步驟 1: 下載影片...');
    execSync(`yt-dlp -f "bestaudio/worst" --no-playlist --no-continue --no-cache-dir --socket-timeout 180 --retries 3 --fragment-retries 3 --user-agent "Xiaohongshu/8.99.1 (iPhone; iOS 16.0; Scale/3.00)" --add-header "Referer: https://www.xiaohongshu.com/" -o "${tempFile}" "${mediaUrl}"`, {
      stdio: 'inherit',
      timeout: 300000 // 5 分鐘超時
    });
    
    if (!fs.existsSync(tempFile)) {
      throw new Error('下載失敗：檔案不存在');
    }
    
    // 2. 獲取時長
    console.log('步驟 2: 獲取時長...');
    const duration = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFile}"`, {
      encoding: 'utf-8',
      timeout: 10000
    }).trim();
    
    // 3. 轉換為 base64
    console.log('步驟 3: 轉換為 base64...');
    const base64Audio = execSync(`ffmpeg -v error -i "${tempFile}" -vn -ac 1 -ar 16000 -acodec pcm_s16le -f wav - 2>/dev/null | base64 | tr -d '\n\r '`, {
      encoding: 'utf-8',
      timeout: 120000 // 2 分鐘超時
    });
    
    // 清理
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    
    console.log('處理完成');
    
    res.json({
      success: true,
      duration: parseFloat(duration),
      audioBase64: base64Audio
    });
  } catch (error) {
    // 清理
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // 忽略清理錯誤
      }
    }
    
    console.error('處理失敗:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 根路徑
app.get('/', (req, res) => {
  res.json({
    service: 'ytdlp-xiaohongshu',
    version: '1.0.0',
    endpoints: {
      'GET /health': '健康檢查',
      'POST /download': '下載並轉換小紅書影片',
      'GET /': '服務資訊'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ytdlp-xiaohongshu 服務運行在端口 ${PORT}`);
  console.log(`健康檢查: http://localhost:${PORT}/health`);
});

