const { app, BrowserWindow, ipcMain, dialog, print } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: '低温箱周转盘点系统',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('print-label', async (event, labelData) => {
  const printWindow = new BrowserWindow({
    show: false,
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  const labelHtml = generateLabelHtml(labelData)
  await printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(labelHtml))

  return new Promise((resolve, reject) => {
    printWindow.webContents.print(
      {
        silent: false,
        printBackground: true,
        margins: { marginType: 'none' }
      },
      (success, errorType) => {
        printWindow.close()
        if (success) {
          resolve({ success: true })
        } else {
          reject({ success: false, error: errorType })
        }
      }
    )
  })
})

function generateLabelHtml(data) {
  const date = data.expectedDate || '待定'
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 80mm;
          padding: 5mm;
          font-family: 'Microsoft YaHei', sans-serif;
          font-size: 12px;
          border: 1px dashed #ccc;
        }
        .label-title {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          color: #e74c3c;
          margin-bottom: 6px;
          border-bottom: 2px solid #e74c3c;
          padding-bottom: 4px;
        }
        .box-code {
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          margin: 8px 0;
          letter-spacing: 2px;
        }
        .info-row {
          margin: 4px 0;
          display: flex;
          justify-content: space-between;
        }
        .info-label {
          color: #666;
        }
        .info-value {
          font-weight: bold;
        }
        .damage {
          background: #fff3f3;
          padding: 4px;
          margin: 6px 0;
          border-radius: 3px;
        }
        .footer {
          margin-top: 8px;
          padding-top: 4px;
          border-top: 1px dashed #ccc;
          text-align: center;
          font-size: 10px;
          color: #999;
        }
        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #e74c3c;
          color: white;
          border-radius: 10px;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="label-title">维 修 标 签</div>
      <div class="box-code">${data.boxCode}</div>
      <div class="info-row">
        <span class="info-label">线路:</span>
        <span class="info-value">${data.route || '-'}</span>
      </div>
      <div class="damage">
        <div class="info-label">破损位置:</div>
        <div class="info-value">${data.damagePosition || '-'}</div>
      </div>
      <div class="info-row">
        <span class="info-label">处理方式:</span>
        <span class="info-value">${data.handleMethod || '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">预计可用:</span>
        <span class="info-value">${date}</span>
      </div>
      <div class="footer">
        <span class="status-badge">待维修</span>
        打印时间: ${data.printTime || ''}
      </div>
    </body>
    </html>
  `
}
