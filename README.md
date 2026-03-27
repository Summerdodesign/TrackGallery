# 轨迹画廊 TrackGallery

上传 GPX 轨迹文件，生成风格化地图海报。支持自定义配色、路线标注、多格式导出。

## 功能

- 上传 GPX 文件，自动解析轨迹
- 自定义配色方案（预设 + 自定义颜色）
- 路线/道路/水系粗细可调
- 轨迹平滑度调节
- 路线标注（手动点击 + 批量地名导入）
- 导出 PNG / JPG / SVG，自定义尺寸，图层可选
- 项目保存与历史管理

## 开发

```bash
npm install
npm run dev
npm test
```

## 部署

推送到 GitHub 后自动通过 GitHub Pages 部署。

需要在仓库 Settings → Pages 中将 Source 设为 **GitHub Actions**。

## 技术栈

React 18 + TypeScript + Vite + HTML5 Canvas + OpenStreetMap Overpass API
