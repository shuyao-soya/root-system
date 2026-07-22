[README.txt](https://github.com/user-attachments/files/30268571/README.txt)
词根图谱网页版 App

文件说明：
- index.html：主页面
- manifest.webmanifest：PWA 安装信息
- sw.js：离线缓存
- icon.svg：应用图标

本地预览：
1. 在此文件夹打开终端。
2. 运行：python3 -m http.server 8000
3. 浏览器打开：http://localhost:8000

上线方式：
- 将整个文件夹上传到 GitHub Pages、Vercel 或 Netlify。
- 不能只上传 index.html；PWA 安装与离线功能需要同目录下的其余文件。

数据说明：
- 新增、删除、掌握度等数据保存在当前浏览器 localStorage。
- 不同设备不会自动同步。
- 请定期使用“导出备份”，需要恢复时使用“导入备份”。
