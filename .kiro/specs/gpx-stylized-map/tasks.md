# 实现计划：GPX 风格化地图生成器

## 概述

基于 React 18 + TypeScript + Vite 构建纯前端应用，使用 HTML5 Canvas 渲染风格化地图，通过 OpenStreetMap Overpass API 获取真实地理数据。实现按模块递增推进：核心数据类型 → GPX 解析 → 视口计算 → 地理数据获取 → Canvas 渲染 → UI 组件 → 导出功能 → 集成联调。

## 任务

- [x] 1. 项目初始化与核心数据类型定义
  - [x] 1.1 使用 Vite 创建 React + TypeScript 项目，安装依赖（fast-check、vitest、html2canvas）
    - 初始化项目结构，配置 Vite、TypeScript、Vitest
    - 创建 `src/types/` 目录，定义所有核心接口和类型：GeoPoint、PixelPoint、Size、BoundingBox、Waypoint、TrackData、ColorScheme、AnnotationIcon、RouteAnnotation、AppState、FlowStep、GeoFeature、ValidationResult、RouteStats、RenderConfig、RenderData、ExportOptions
    - 定义 3 套预设配色方案常量 PRESET_SCHEMES（暗夜荧光、午夜蓝、暖焰）
    - 定义 12 种预设标注图标类型常量
    - _需求: 11.3, 12.4_

- [x] 2. GPX 解析模块
  - [x] 2.1 实现 GPXParser：parse、format、validate 方法
    - 创建 `src/utils/gpx-parser.ts`
    - 使用 DOMParser 解析 GPX XML，支持 GPX 1.0 和 1.1 格式
    - 实现 parse：提取 `<trk>/<trkseg>/<trkpt>` 轨迹点和 `<wpt>` 途径点，保持顺序
    - 实现 format：将 TrackData 格式化为 Pretty Print 的 GPX XML 字符串
    - 实现 validate：验证 XML 合法性和轨迹数据存在性，返回 ValidationResult
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.2 编写 GPX 解析属性测试：往返一致性
    - **属性 1: GPX 解析往返一致性**
    - 使用 fast-check 生成随机 TrackData，验证 parse(format(trackData)) 等价于原始 trackData
    - **验证需求: 2.1, 2.6, 2.7**

  - [ ]* 2.3 编写 GPX 解析属性测试：途径点提取完整性
    - **属性 2: GPX 途径点提取完整性**
    - 使用 fast-check 生成含随机数量 `<wpt>` 元素的 GPX XML，验证解析后途径点数量和内容一致
    - **验证需求: 2.3**

  - [ ]* 2.4 编写 GPX 解析属性测试：轨迹点顺序保持
    - **属性 3: GPX 轨迹点顺序保持**
    - 使用 fast-check 生成含有序 `<trkpt>` 元素的 GPX XML，验证解析后顺序不变
    - **验证需求: 2.4**

  - [ ]* 2.5 编写 GPX 解析属性测试：无效内容错误处理
    - **属性 4: 无效 GPX 内容错误处理**
    - 使用 fast-check 生成随机无效 XML 字符串，验证解析器返回错误结果而非抛出异常
    - **验证需求: 2.5**

  - [ ]* 2.6 编写 GPX 解析属性测试：版本兼容性
    - **属性 19: GPX 版本兼容性**
    - 使用 fast-check 生成 GPX 1.0 和 1.1 格式内容，验证均可成功解析
    - **验证需求: 2.2**

- [x] 3. 文件上传验证模块
  - [x] 3.1 实现文件上传验证器
    - 创建 `src/utils/upload-validator.ts`
    - 验证文件扩展名为 `.gpx`（不区分大小写）
    - 验证文件大小不超过 10MB
    - 返回对应的错误提示信息
    - _需求: 1.2, 1.3, 1.4_

  - [ ]* 3.2 编写文件上传验证属性测试
    - **属性 5: 文件上传验证**
    - 使用 fast-check 生成随机文件名和文件大小，验证非 .gpx 或超 10MB 被拒绝
    - **验证需求: 1.2, 1.4**

- [x] 4. 视口计算模块
  - [x] 4.1 实现 ViewportCalculator：calculateBoundingBox、expandBoundingBox、calculateZoomLevel、geoToPixel
    - 创建 `src/utils/viewport-calculator.ts`
    - 实现 calculateBoundingBox：遍历所有轨迹点计算 min/max 经纬度
    - 实现 expandBoundingBox：在边界框基础上向四周扩展指定比例（默认 20%）
    - 实现 calculateZoomLevel：根据扩展后边界框和画布尺寸计算缩放级别
    - 实现 geoToPixel：使用 Web Mercator 投影将地理坐标转换为画布像素坐标
    - _需求: 3.1, 3.2, 3.3_

  - [ ]* 4.2 编写视口计算属性测试：边界框包含性
    - **属性 6: 边界框包含所有轨迹点**
    - 使用 fast-check 生成随机 GeoPoint 数组，验证所有点在 BoundingBox 范围内
    - **验证需求: 3.1**

  - [ ]* 4.3 编写视口计算属性测试：边界框扩展单调性
    - **属性 7: 边界框扩展单调性**
    - 使用 fast-check 生成随机 BoundingBox 和正数比例，验证扩展后严格包含原始框
    - **验证需求: 3.2**

  - [ ]* 4.4 编写视口计算属性测试：视口内完整可见
    - **属性 8: 视口内轨迹点完整可见**
    - 使用 fast-check 生成随机轨迹点和画布尺寸，验证转换后像素坐标在画布范围内
    - **验证需求: 3.3**

- [x] 5. 检查点 - 核心工具模块验证
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 6. 路线统计与辅助工具
  - [x] 6.1 实现路线统计计算和辅助验证函数
    - 创建 `src/utils/route-stats.ts`：实现 Haversine 距离计算和总距离统计
    - 创建 `src/utils/color-validator.ts`：实现十六进制色值验证（匹配 `#[0-9a-fA-F]{6}`）
    - 创建 `src/utils/annotation-validator.ts`：实现标注文字长度验证（不超过 50 字符）
    - 创建 `src/utils/step-flow.ts`：实现步骤流程状态转换逻辑（upload → colorScheme → annotation → export）
    - _需求: 7.4, 11.7, 12.5, 10.2_

  - [ ]* 6.2 编写路线距离计算属性测试
    - **属性 10: 路线总距离计算正确性**
    - 使用 fast-check 生成随机 GeoPoint 序列，验证总距离等于相邻点 Haversine 距离之和，非负，空/单点为 0
    - **验证需求: 7.4**

  - [ ]* 6.3 编写十六进制色值验证属性测试
    - **属性 13: 十六进制色值验证**
    - 使用 fast-check 生成随机字符串，验证仅 `#[0-9a-fA-F]{6}` 格式被接受
    - **验证需求: 11.7**

  - [ ]* 6.4 编写标注文字长度限制属性测试
    - **属性 16: 标注文字长度限制**
    - 使用 fast-check 生成随机字符串，验证超过 50 字符被拒绝
    - **验证需求: 12.5**

  - [ ]* 6.5 编写步骤流程状态转换属性测试
    - **属性 12: 步骤流程状态转换合法性**
    - 使用 fast-check 生成随机步骤状态和转换目标，验证仅合法转换被允许
    - **验证需求: 10.2**

- [x] 7. Overpass 地理数据服务模块
  - [x] 7.1 实现 OverpassService：fetchRoads、fetchWaterways、buildQuery
    - 创建 `src/services/overpass-service.ts`
    - 实现 buildQuery：根据 BoundingBox 和要素类型构建 Overpass QL 查询语句
    - 实现 fetchRoads：请求道路网络数据（highway 标签：motorway/trunk/primary/secondary/tertiary/residential）
    - 实现 fetchWaterways：请求水系数据（waterway 标签：river/stream/canal + natural=water）
    - 解析 Overpass API JSON 响应为 GeoFeature[] 格式
    - 实现请求超时（30s）和错误处理，支持重试
    - _需求: 4.2, 13.1, 13.2, 13.3, 13.5, 13.6, 13.7_

  - [ ]* 7.2 编写 Overpass 查询构建属性测试
    - **属性 18: Overpass 查询包含正确要素类型**
    - 使用 fast-check 生成随机 BoundingBox，验证道路查询包含正确 highway 标签，水系查询包含正确 waterway 标签
    - **验证需求: 13.5, 13.6**

- [x] 8. Canvas 地图渲染模块
  - [x] 8.1 实现 MapRenderer 核心渲染逻辑
    - 创建 `src/renderers/map-renderer.ts`
    - 实现 init：绑定 Canvas 元素和渲染配置
    - 实现 renderBackground：使用 ColorScheme 背景色填充画布
    - 实现 renderContextLayer：以灰色细线（0.5-1px）绘制道路网络，以深蓝灰色绘制水系，不显示文字标注
    - 实现 renderRouteLayer：以 2-3px 线宽绘制路线轨迹，添加发光效果（glow），按轨迹点顺序连接
    - 实现 renderWaypointLayer：在途径点位置绘制圆形标记和名称标签，在起点/终点绘制特殊标记
    - 实现 renderAnnotationLayer：在标注点位置绘制图标和文字说明
    - 实现 render：按顺序调用各层渲染（背景 → 肌理 → 路线 → 途径点 → 标注）
    - 实现 toDataURL：导出 Canvas 数据
    - _需求: 4.1, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 12.6, 12.8_

  - [ ]* 8.2 编写起终点标记位置属性测试
    - **属性 9: 起终点标记位置正确**
    - 使用 fast-check 生成随机 TrackData，验证起点标记坐标等于第一个轨迹点，终点标记坐标等于最后一个轨迹点
    - **验证需求: 6.4, 6.5**

- [x] 9. 检查点 - 渲染模块验证
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 10. UI 组件：文件上传
  - [x] 10.1 实现 Upload 组件
    - 创建 `src/components/Upload.tsx`
    - 实现文件上传区域，支持点击选择和拖拽上传
    - 集成文件验证（扩展名、大小）和 GPX 解析
    - 显示错误提示信息
    - 显示加载进度指示器
    - _需求: 1.1, 1.2, 1.3, 1.4, 10.3_

- [x] 11. UI 组件：配色方案编辑器
  - [x] 11.1 实现 ColorSchemeEditor 组件
    - 创建 `src/components/ColorSchemeEditor.tsx`
    - 实现 7 个颜色选择器（背景色、路线颜色、路线发光色、道路肌理颜色、水系颜色、途径点标记颜色、标题文字颜色）
    - 支持色盘选取和十六进制色值输入
    - 显示当前色值的十六进制代码
    - 实现预设配色方案快速选择（至少 3 套）
    - 集成十六进制色值格式验证，非法输入保留上一个有效值
    - 配色变更时触发 onChange 回调实现实时预览
    - _需求: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ]* 11.2 编写预设配色方案应用属性测试
    - **属性 14: 预设配色方案应用完整性**
    - 使用 fast-check 从预设方案中随机选择，验证所有 7 个颜色字段都更新为预设值
    - **验证需求: 11.6**

- [x] 12. UI 组件：标注编辑器
  - [x] 12.1 实现 AnnotationEditor 组件
    - 创建 `src/components/AnnotationEditor.tsx`
    - 实现「添加标注」模式按钮和模式切换
    - 实现鼠标悬停路线时高亮最近路线点（findNearestTrackPoint）
    - 实现点击路线点弹出编辑面板（图标选择 + 文字输入）
    - 提供至少 10 个预设图标选择
    - 实现文字说明输入（不超过 50 字符）
    - 实现已有标注的编辑和删除功能
    - _需求: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [ ]* 12.2 编写最近路线点查找属性测试
    - **属性 15: 最近路线点查找正确性**
    - 使用 fast-check 生成随机像素坐标和轨迹点集合，验证返回的点是欧氏距离最小的点
    - **验证需求: 12.2**

- [x] 13. UI 组件：海报布局、图例面板与步骤流程
  - [x] 13.1 实现 PosterLayout、LegendPanel、StepFlow 组件
    - 创建 `src/components/PosterLayout.tsx`：标题区域（可自定义标题，默认使用轨迹名称）+ 统计信息（总距离、轨迹点数量）+ 地图区域 + 图例区域
    - 创建 `src/components/LegendPanel.tsx`：右下角半透明暗色背景，包含路线轨迹、途径点、周围道路三个说明条目
    - 创建 `src/components/StepFlow.tsx`：管理 upload → colorScheme → annotation → export 步骤流程
    - _需求: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 10.2, 10.4, 10.5_

  - [ ]* 13.2 编写默认标题属性测试
    - **属性 11: 默认标题使用轨迹名称**
    - 使用 fast-check 生成随机 TrackData，验证未自定义标题时海报标题等于 TrackData.name
    - **验证需求: 7.2**

- [x] 14. 检查点 - UI 组件验证
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 15. 导出模块
  - [x] 15.1 实现 ExportModule：exportAsPNG
    - 创建 `src/utils/export-module.ts`
    - 实现将完整海报（标题区 + 地图区 + 图例区）导出为 PNG
    - 确保导出分辨率不低于 1920x1080
    - 导出图片包含所有标注的图标和文字
    - 实现导出按钮和下载触发
    - _需求: 9.1, 9.2, 9.3, 9.4, 12.9_

  - [ ]* 15.2 编写导出最小分辨率属性测试
    - **属性 17: 导出图片最小分辨率**
    - 使用 fast-check 生成随机导出配置，验证输出宽度 >= 1920，高度 >= 1080
    - **验证需求: 9.3**

- [x] 16. 应用集成与主页面组装
  - [x] 16.1 实现 App 主组件，集成所有模块
    - 创建 `src/App.tsx`：管理 AppState 全局状态
    - 集成步骤流程：上传 → 配色 → 标注 → 导出
    - 连接 GPXParser → ViewportCalculator → OverpassService → MapRenderer 数据流
    - 实现加载状态指示器和错误提示
    - 实现地图渲染完成后自动滚动到地图区域
    - 实现配色确认后进入标注步骤
    - 实现渲染错误后允许重新上传
    - 实现响应式布局（桌面 >= 1024px，移动端 >= 375px）
    - _需求: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 17. 最终检查点 - 全功能验证
  - 确保所有测试通过，如有问题请向用户确认。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号，确保可追溯性
- 检查点任务用于阶段性验证，确保增量开发的正确性
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
