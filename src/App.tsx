import { useState, useRef, useCallback, useEffect } from 'react';
import type { AppState, TrackData, ColorScheme, RouteAnnotation, GeoFeature, RenderConfig, BoundingBox } from './types';
import { PRESET_SCHEMES } from './constants';
import { Upload } from './components/Upload';
import { ColorSchemeEditor } from './components/ColorSchemeEditor';
import { AnnotationEditor, findNearestTrackPoint } from './components/AnnotationEditor';
import { BatchAnnotationImport } from './components/BatchAnnotationImport';
import { PosterLayout } from './components/PosterLayout';
import { StepFlow } from './components/StepFlow';
import { calculateBoundingBox, expandBoundingBox, calculateZoomLevel, geoToPixel } from './utils/viewport-calculator';
import { calculateRouteStats } from './utils/route-stats';
import { fetchRoads, fetchWaterways } from './services/overpass-service';
import { MapRenderer } from './renderers/map-renderer';
import { smoothTrack } from './utils/track-smoother';
import { getNextStep, getPrevStep } from './utils/step-flow';
import { ExportPanel } from './components/ExportPanel';
import type { ExportSettings } from './components/ExportPanel';
import type { FlowStep } from './types';

const CANVAS_SIZE = { width: 4000, height: 4000 };

interface HistoryItem {
  id: string;
  name: string;
  projectName: string;
  thumbnail: string;
  trackData: TrackData;
  colorScheme: ColorScheme;
  annotations: RouteAnnotation[];
  geoFeatures: GeoFeature[];
}

const initialState: AppState = {
  step: 'upload',
  gpxFile: null,
  trackData: null,
  colorScheme: PRESET_SCHEMES[0],
  annotations: [],
  geoFeatures: [],
  isLoading: false,
  error: null,
};

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('gpx-map-history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [annotationAddMode, setAnnotationAddMode] = useState(false);
  const [pendingTrackPointIndex, setPendingTrackPointIndex] = useState<number | null>(null);
  const [routeWidth, setRouteWidth] = useState(2.5);
  const [roadWidth, setRoadWidth] = useState(3);
  const [waterWidth, setWaterWidth] = useState(4);
  const [smoothness, setSmoothness] = useState(0);
  const [annotationFontSize, setAnnotationFontSize] = useState(108);
  const [projectName, setProjectName] = useState('');
  const [exportLayers, setExportLayers] = useState<import('./components/ExportPanel').ExportLayers>({ background: true, route: true, roads: true, water: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef(new MapRenderer());

  // Render map whenever relevant data changes
  const renderMap = useCallback((
    trackData: TrackData,
    colorScheme: ColorScheme,
    geoFeatures: GeoFeature[],
    annotations: RouteAnnotation[],
    bbox: BoundingBox,
    rw: number = 2.5,
    rdw: number = 3,
    ww: number = 4,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomLevel = calculateZoomLevel(bbox, CANVAS_SIZE);
    const config: RenderConfig = { canvasSize: CANVAS_SIZE, bbox, zoomLevel, routeWidth: rw, roadWidth: rdw, waterWidth: ww };

    const renderer = rendererRef.current;
    renderer.init(canvas, config);
    renderer.render({
      trackData,
      geoFeatures,
      colorScheme,
      annotations,
      renderConfig: config,
    });
  }, []);

  // Compute bbox from trackData (memoized via ref to avoid recalc)
  const bboxRef = useRef<BoundingBox | null>(null);

  const getBbox = useCallback((trackData: TrackData): BoundingBox => {
    if (!bboxRef.current) {
      const raw = calculateBoundingBox(trackData.trackPoints);
      bboxRef.current = expandBoundingBox(raw);
    }
    return bboxRef.current;
  }, []);

  // Persist history to localStorage
  useEffect(() => {
    try {
      // Limit to 10 items and cap thumbnail size
      const toSave = history.slice(0, 10);
      localStorage.setItem('gpx-map-history', JSON.stringify(toSave));
    } catch { /* storage full, ignore */ }
  }, [history]);

  // Re-render map when colorScheme, annotations, or smoothness change
  useEffect(() => {
    if (!state.trackData || state.step === 'upload') return;
    const bbox = getBbox(state.trackData);
    const smoothed: TrackData = {
      ...state.trackData,
      trackPoints: smoothTrack(state.trackData.trackPoints, smoothness),
    };
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomLevel = calculateZoomLevel(bbox, CANVAS_SIZE);
    const config: RenderConfig = {
      canvasSize: CANVAS_SIZE, bbox, zoomLevel,
      routeWidth, roadWidth, waterWidth, annotationFontSize,
    };
    const renderer = rendererRef.current;
    renderer.init(canvas, config);

    const renderData: import('./types').RenderData = {
      trackData: smoothed,
      geoFeatures: state.geoFeatures,
      colorScheme: state.colorScheme,
      annotations: state.annotations,
      renderConfig: config,
    };

    if (state.step === 'export') {
      renderer.renderSelective(renderData, exportLayers, !exportLayers.background);
    } else {
      renderer.render(renderData);
    }
  }, [state.colorScheme, state.annotations, state.trackData, state.geoFeatures, state.step, getBbox, routeWidth, roadWidth, waterWidth, smoothness, exportLayers, annotationFontSize]);

  // Handle GPX upload success
  const handleUpload = useCallback(async (trackData: TrackData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, trackData }));
    bboxRef.current = null; // reset bbox for new track

    try {
      const rawBbox = calculateBoundingBox(trackData.trackPoints);
      const bbox = expandBoundingBox(rawBbox);
      bboxRef.current = bbox;

      // Fetch geo data (roads + waterways) in parallel
      let geoFeatures: GeoFeature[] = [];
      try {
        const [roads, waterways] = await Promise.all([
          fetchRoads(bbox),
          fetchWaterways(bbox),
        ]);
        geoFeatures = [...roads, ...waterways];
      } catch (geoErr) {
        // Geo data fetch failure is non-fatal, continue without context layer
        console.warn('地理数据获取失败，将不显示道路和水系', geoErr);
        setState(prev => ({ ...prev, error: '城市肌理数据加载失败（道路/水系），可能是网络问题。地图仍可使用。' }));
      }

      setState(prev => ({
        ...prev,
        geoFeatures,
        isLoading: false,
        step: 'colorScheme',
      }));
      setProjectName(trackData.name || 'GPX 轨迹');

      // Auto-scroll to map area after render
      setTimeout(() => {
        mapSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : '处理 GPX 文件时发生错误',
      }));
    }
  }, []);

  const handleColorSchemeChange = useCallback((colorScheme: ColorScheme) => {
    setState(prev => ({ ...prev, colorScheme }));
  }, []);

  const handleAnnotationsChange = useCallback((annotations: RouteAnnotation[]) => {
    setState(prev => ({ ...prev, annotations }));
  }, []);

  // Canvas click handler for annotation mode
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!annotationAddMode || !state.trackData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Scale from display coords to canvas coords
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Convert all track points to pixel coords
    const bbox = getBbox(state.trackData);
    const pixelPoints = state.trackData.trackPoints.map(p =>
      geoToPixel(p, bbox, CANVAS_SIZE)
    );

    const idx = findNearestTrackPoint({ x: clickX, y: clickY }, pixelPoints);
    if (idx >= 0) {
      // Check distance threshold (within 50px of canvas coords)
      const dx = pixelPoints[idx].x - clickX;
      const dy = pixelPoints[idx].y - clickY;
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
        setPendingTrackPointIndex(idx);
      }
    }
  }, [annotationAddMode, state.trackData, getBbox]);

  const handleStepChange = useCallback((step: FlowStep) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const handleConfirmColorScheme = useCallback(() => {
    const next = getNextStep('colorScheme');
    if (next) setState(prev => ({ ...prev, step: next }));
  }, []);

  const handleGoBack = useCallback(() => {
    const prev = getPrevStep(state.step);
    if (prev) setState(s => ({ ...s, step: prev }));
  }, [state.step]);

  const handleConfirmAnnotation = useCallback(() => {
    const next = getNextStep('annotation');
    if (next) setState(prev => ({ ...prev, step: next }));
  }, []);

  const handleExport = useCallback(async (settings: ExportSettings) => {
    if (!state.trackData) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const bbox = getBbox(state.trackData);
      const exportSize = { width: settings.width, height: settings.height };
      const zoomLevel = calculateZoomLevel(bbox, exportSize);
      const config: RenderConfig = {
        canvasSize: exportSize, bbox, zoomLevel,
        routeWidth: routeWidth * (settings.width / CANVAS_SIZE.width),
        roadWidth: roadWidth * (settings.width / CANVAS_SIZE.width),
        waterWidth: waterWidth * (settings.width / CANVAS_SIZE.width),
        annotationFontSize: annotationFontSize * (settings.width / CANVAS_SIZE.width),
      };

      // Create offscreen canvas for export
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = settings.width;
      exportCanvas.height = settings.height;
      const exportRenderer = new MapRenderer();
      exportRenderer.init(exportCanvas, config);

      const renderData: import('./types').RenderData = {
        trackData: {
          ...state.trackData,
          trackPoints: smoothTrack(state.trackData.trackPoints, smoothness),
        },
        geoFeatures: state.geoFeatures,
        colorScheme: state.colorScheme,
        annotations: state.annotations,
        renderConfig: config,
      };

      exportRenderer.renderSelective(renderData, settings.layers, !settings.layers.background);

      const filename = state.trackData.name || 'gpx-map';

      if (settings.format === 'svg') {
        // SVG: transparent background, embed canvas content as PNG with alpha
        const dataUrl = exportCanvas.toDataURL('image/png');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${settings.width}" height="${settings.height}" viewBox="0 0 ${settings.width} ${settings.height}">
  <image xlink:href="${dataUrl}" width="${settings.width}" height="${settings.height}"/>
</svg>`;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        triggerDownload(blob, `${filename}.svg`);
      } else {
        const mimeType = settings.format === 'jpg' ? 'image/jpeg' : 'image/png';
        const quality = settings.format === 'jpg' ? 0.92 : undefined;
        exportCanvas.toBlob((blob) => {
          if (blob) triggerDownload(blob, `${filename}.${settings.format}`);
        }, mimeType, quality);
      }

      setState(prev => ({ ...prev, isLoading: false }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : '导出失败',
      }));
    }
  }, [state.trackData, state.colorScheme, state.annotations, state.geoFeatures, getBbox, routeWidth, roadWidth, waterWidth, smoothness, annotationFontSize]);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRetry = useCallback(() => {
    setState(initialState);
  }, []);

  const handleContinueUpload = useCallback(() => {
    if (state.trackData) {
      const thumbnail = generateThumbnail();
      const item: HistoryItem = {
        id: Date.now().toString(),
        name: state.trackData.name || 'GPX 轨迹',
        projectName,
        thumbnail,
        trackData: state.trackData,
        colorScheme: state.colorScheme,
        annotations: state.annotations,
        geoFeatures: state.geoFeatures,
      };
      setHistory(prev => {
        if (prev.some(h => h.name === item.name && h.trackData.trackPoints.length === item.trackData.trackPoints.length)) return prev;
        return [item, ...prev];
      });
    }
    setState(initialState);
    setProjectName('');
    bboxRef.current = null;
  }, [state.trackData, state.colorScheme, state.annotations, state.geoFeatures]);

  const handleLoadHistory = useCallback((item: HistoryItem) => {
    bboxRef.current = null;
    setCurrentProjectId(item.id);
    setProjectName(item.projectName || item.name);
    setState({
      step: 'colorScheme',
      gpxFile: null,
      trackData: item.trackData,
      colorScheme: item.colorScheme,
      annotations: item.annotations,
      geoFeatures: item.geoFeatures,
      isLoading: false,
      error: null,
    });
    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const handleDeleteHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  }, []);

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState(false);

  /** 生成小尺寸缩略图，避免 localStorage 爆掉 */
  const generateThumbnail = useCallback((): string => {
    const src = canvasRef.current;
    if (!src) return '';
    const thumbSize = 200;
    const thumb = document.createElement('canvas');
    thumb.width = thumbSize;
    thumb.height = thumbSize;
    const ctx = thumb.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, thumbSize, thumbSize);
    return thumb.toDataURL('image/jpeg', 0.6);
  }, []);

  const handleSaveProject = useCallback(() => {
    if (!state.trackData) return;
    const thumbnail = generateThumbnail();
    const id = currentProjectId || Date.now().toString();
    const item: HistoryItem = {
      id,
      name: state.trackData.name || 'GPX 轨迹',
      projectName,
      thumbnail,
      trackData: state.trackData,
      colorScheme: state.colorScheme,
      annotations: state.annotations,
      geoFeatures: state.geoFeatures,
    };
    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== id);
      return [item, ...filtered];
    });
    setCurrentProjectId(id);
    // 显示保存成功提示
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  }, [state.trackData, state.colorScheme, state.annotations, state.geoFeatures, currentProjectId, generateThumbnail, projectName]);

  const handleGoHome = useCallback(() => {
    // Save current project first, then go to upload
    handleSaveProject();
    setState(initialState);
    bboxRef.current = null;
    setCurrentProjectId(null);
  }, [handleSaveProject]);

  const stats = state.trackData ? calculateRouteStats(state.trackData) : null;

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>轨迹画廊 TrackGallery</h1>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <StepFlow currentStep={state.step} onStepChange={handleStepChange} />
        {state.step !== 'upload' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSaveProject} style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid #4a9eff',
              background: 'transparent', color: '#4a9eff', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              💾 保存项目
            </button>
            <button onClick={handleGoHome} style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid #555',
              background: 'transparent', color: '#aaa', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              🏠 返回主页
            </button>
          </div>
        )}
      </div>

      {/* 保存成功提示 */}
      {saveToast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 24px', borderRadius: 8, background: 'rgba(0,200,100,0.9)',
          color: '#fff', fontSize: 14, fontWeight: 600, zIndex: 999,
        }}>
          ✓ 项目已保存
        </div>
      )}

      {/* Error banner */}
      {state.error && (
        <div data-testid="error-banner" style={errorBannerStyle}>
          <span>{state.error}</span>
          <button onClick={handleRetry} style={retryBtnStyle}>重新上传</button>
        </div>
      )}

      {/* Loading overlay */}
      {state.isLoading && (
        <div data-testid="loading-overlay" style={loadingStyle}>
          <div style={spinnerStyle} />
          <p style={{ color: '#aaa', marginTop: 12 }}>处理中…</p>
        </div>
      )}

      {/* Step: Upload */}
      {state.step === 'upload' && (
        <div style={sectionStyle}>
          <Upload onUpload={handleUpload} isLoading={state.isLoading} />

          {/* 历史项目列表 */}
          {history.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 15, color: '#aaa', marginBottom: 12 }}>历史项目</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {history.map(item => (
                  <div key={item.id} style={{
                    borderRadius: 8, border: '1px solid #333', overflow: 'hidden',
                    background: '#1e1e1e', cursor: 'pointer', transition: 'border-color 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#4a9eff')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#333')}
                  >
                    <div onClick={() => handleLoadHistory(item)}>
                      {item.thumbnail && (
                        <img src={item.thumbnail} alt={item.name}
                          style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block', background: '#111' }} />
                      )}
                      <div style={{ padding: '8px 10px' }}>
                        <div style={{ fontSize: 13, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.projectName || item.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                          {item.trackData.trackPoints.length} 点 · {item.annotations.length} 标注
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteHistory(item.id)} style={{
                      width: '100%', padding: '5px 0', border: 'none', borderTop: '1px solid #333',
                      background: 'transparent', color: '#ff6b6b', fontSize: 11, cursor: 'pointer',
                    }}>删除</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map preview + side panels for colorScheme / annotation / export */}
      {state.step !== 'upload' && state.trackData && stats && (
        <div>
          {/* Geo data status */}
          <div style={{
            padding: '8px 14px',
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
            background: state.geoFeatures.length > 0 ? 'rgba(0,200,100,0.1)' : 'rgba(255,180,0,0.1)',
            border: state.geoFeatures.length > 0 ? '1px solid rgba(0,200,100,0.3)' : '1px solid rgba(255,180,0,0.3)',
            color: state.geoFeatures.length > 0 ? '#66cc88' : '#ffaa33',
          }}>
            {state.geoFeatures.length > 0
              ? `✓ 已加载 ${state.geoFeatures.filter(f => f.type === 'road').length} 条道路 + ${state.geoFeatures.filter(f => f.type === 'water').length} 条水系`
              : '⚠ 道路和水系数据未加载（可能是网络问题）'}
          </div>
          <div style={mainLayoutStyle}>
          {/* Map area */}
          <div ref={mapSectionRef} style={mapAreaStyle}>
            <div ref={posterRef}>
              <PosterLayout
                title={projectName || state.trackData.name || 'GPX 轨迹'}
                stats={stats}
                colorScheme={state.colorScheme}
                canvasRef={canvasRef}
                hasWaypoints={state.trackData.waypoints.length > 0}
                hasAnnotations={state.annotations.length > 0}
                onCanvasClick={handleCanvasClick}
                canvasCursor={annotationAddMode ? 'crosshair' : undefined}
              />
            </div>
          </div>

          {/* Side panel */}
          <div style={sidePanelStyle}>
            {/* 返回上一步按钮 */}
            {state.step !== 'colorScheme' && (
              <button onClick={handleGoBack} style={backBtnStyle}>← 上一步</button>
            )}

            {/* 项目名称 */}
            <div style={{ padding: '12px 16px 4px' }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>项目名称</div>
              <input
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="输入项目名称…"
                style={{
                  width: '100%', padding: '6px 10px', borderRadius: 6,
                  border: '1px solid #555', background: '#2a2a2a', color: '#eee',
                  fontSize: 14, boxSizing: 'border-box',
                }}
              />
            </div>

            {state.step === 'colorScheme' && (
              <>
                <ColorSchemeEditor
                  colorScheme={state.colorScheme}
                  presets={PRESET_SCHEMES}
                  onChange={handleColorSchemeChange}
                  routeWidth={routeWidth}
                  onRouteWidthChange={setRouteWidth}
                  roadWidth={roadWidth}
                  onRoadWidthChange={setRoadWidth}
                  waterWidth={waterWidth}
                  onWaterWidthChange={setWaterWidth}
                  smoothness={smoothness}
                  onSmoothnessChange={setSmoothness}
                  annotationFontSize={annotationFontSize}
                  onAnnotationFontSizeChange={setAnnotationFontSize}
                />
                <button
                  data-testid="confirm-color-btn"
                  onClick={handleConfirmColorScheme}
                  style={primaryBtnStyle}
                >
                  确认配色 →
                </button>
              </>
            )}

            {state.step === 'annotation' && (
              <>
                <AnnotationEditor
                  annotations={state.annotations}
                  trackPoints={state.trackData.trackPoints}
                  onChange={handleAnnotationsChange}
                  onAddModeChange={setAnnotationAddMode}
                  pendingTrackPointIndex={pendingTrackPointIndex}
                  onPendingConsumed={() => setPendingTrackPointIndex(null)}
                />
                <div style={{ padding: '0 16px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ width: 120, fontSize: 13, color: '#ccc', flexShrink: 0 }}>标注字体</label>
                    <input type="range" min={24} max={300} step={6} value={annotationFontSize}
                      onChange={(e) => setAnnotationFontSize(parseInt(e.target.value))} style={{ flex: 1 }} />
                    <span style={{ fontSize: 13, color: '#ccc', minWidth: 42, textAlign: 'right' }}>{annotationFontSize}px</span>
                  </div>
                </div>
                <BatchAnnotationImport
                  trackPoints={state.trackData.trackPoints}
                  bbox={getBbox(state.trackData)}
                  canvasSize={CANVAS_SIZE}
                  existingAnnotations={state.annotations}
                  onImport={handleAnnotationsChange}
                />
                <button
                  data-testid="confirm-annotation-btn"
                  onClick={handleConfirmAnnotation}
                  style={primaryBtnStyle}
                >
                  完成标注 →
                </button>
              </>
            )}

            {state.step === 'export' && (
              <ExportPanel isLoading={state.isLoading} onExport={handleExport} layers={exportLayers} onLayersChange={setExportLayers} />
            )}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

// ---- Styles ----

const containerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '16px 20px',
  minHeight: '100vh',
  boxSizing: 'border-box',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 8,
};

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: '#eee',
  margin: '8px 0',
};

const sectionStyle: React.CSSProperties = {
  marginTop: 24,
};

const mainLayoutStyle: React.CSSProperties = {
  display: 'flex',
  gap: 20,
  marginTop: 16,
  flexWrap: 'wrap',
};

const mapAreaStyle: React.CSSProperties = {
  flex: '1 1 600px',
  minWidth: 0,
  borderRadius: 8,
  overflow: 'hidden',
  border: '1px solid #333',
};

const sidePanelStyle: React.CSSProperties = {
  flex: '0 0 320px',
  maxWidth: 360,
  background: '#1e1e1e',
  borderRadius: 8,
  border: '1px solid #333',
  overflow: 'auto',
  maxHeight: '80vh',
};

const errorBannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 16px',
  borderRadius: 8,
  background: 'rgba(255,107,107,0.12)',
  border: '1px solid rgba(255,107,107,0.3)',
  color: '#ff6b6b',
  fontSize: 14,
  marginBottom: 12,
};

const retryBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: 4,
  border: '1px solid #ff6b6b',
  background: 'transparent',
  color: '#ff6b6b',
  cursor: 'pointer',
  fontSize: 13,
  whiteSpace: 'nowrap',
};

const loadingStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '32px 0',
};

const spinnerStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  border: '3px solid #333',
  borderTop: '3px solid #4a9eff',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  margin: '0 auto',
};

const primaryBtnStyle: React.CSSProperties = {
  display: 'block',
  width: 'calc(100% - 32px)',
  margin: '12px 16px 16px',
  padding: '10px 0',
  borderRadius: 8,
  border: 'none',
  background: '#4a9eff',
  color: '#fff',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};

const backBtnStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 16px',
  border: 'none',
  borderBottom: '1px solid #333',
  background: 'transparent',
  color: '#888',
  fontSize: 13,
  cursor: 'pointer',
  textAlign: 'left',
};
