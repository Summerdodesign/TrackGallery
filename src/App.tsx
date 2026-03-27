import { useState, useRef, useCallback, useEffect } from 'react';
import type { AppState, TrackData, ColorScheme, RouteAnnotation, GeoFeature, RenderConfig, BoundingBox } from './types';
import { PRESET_SCHEMES } from './constants';
import { Upload } from './components/Upload';
import { ColorSchemeEditor } from './components/ColorSchemeEditor';
import { AnnotationEditor, findNearestTrackPoint } from './components/AnnotationEditor';
import { PosterLayout } from './components/PosterLayout';
import { StepFlow } from './components/StepFlow';
import { calculateBoundingBox, expandBoundingBox, calculateZoomLevel, geoToPixel } from './utils/viewport-calculator';
import { calculateRouteStats } from './utils/route-stats';
import { fetchRoads, fetchWaterways } from './services/overpass-service';
import { MapRenderer } from './renderers/map-renderer';
import { exportAsPNG } from './utils/export-module';
import { getNextStep } from './utils/step-flow';
import type { FlowStep } from './types';

const CANVAS_SIZE = { width: 4000, height: 4000 };

interface HistoryItem {
  id: string;
  name: string;
  thumbnail: string; // data URL
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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [annotationAddMode, setAnnotationAddMode] = useState(false);
  const [pendingTrackPointIndex, setPendingTrackPointIndex] = useState<number | null>(null);
  const [routeWidth, setRouteWidth] = useState(2.5);
  const [roadWidth, setRoadWidth] = useState(3);
  const [waterWidth, setWaterWidth] = useState(4);
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

  // Re-render map when colorScheme or annotations change (after initial load)
  useEffect(() => {
    if (!state.trackData || state.step === 'upload') return;
    const bbox = getBbox(state.trackData);
    renderMap(state.trackData, state.colorScheme, state.geoFeatures, state.annotations, bbox, routeWidth, roadWidth, waterWidth);
  }, [state.colorScheme, state.annotations, state.trackData, state.geoFeatures, state.step, renderMap, getBbox, routeWidth, roadWidth, waterWidth]);

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

  const handleConfirmAnnotation = useCallback(() => {
    const next = getNextStep('annotation');
    if (next) setState(prev => ({ ...prev, step: next }));
  }, []);

  const handleExport = useCallback(async () => {
    const posterEl = posterRef.current;
    if (!posterEl) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await exportAsPNG(posterEl, {
        minWidth: 14173,
        minHeight: 14173,
        filename: state.trackData?.name || 'gpx-map',
      });

      // Save to history after successful export
      if (state.trackData && canvasRef.current) {
        const thumbnail = canvasRef.current.toDataURL('image/png', 0.3);
        const item: HistoryItem = {
          id: Date.now().toString(),
          name: state.trackData.name || 'GPX 轨迹',
          thumbnail,
          trackData: state.trackData,
          colorScheme: state.colorScheme,
          annotations: state.annotations,
          geoFeatures: state.geoFeatures,
        };
        setHistory(prev => [item, ...prev]);
      }

      setState(prev => ({ ...prev, isLoading: false }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : '导出失败',
      }));
    }
  }, [state.trackData, state.colorScheme, state.annotations, state.geoFeatures]);

  const handleRetry = useCallback(() => {
    setState(initialState);
  }, []);

  const handleContinueUpload = useCallback(() => {
    // Save current to history if not already saved
    if (state.trackData && canvasRef.current) {
      const thumbnail = canvasRef.current.toDataURL('image/png', 0.3);
      const item: HistoryItem = {
        id: Date.now().toString(),
        name: state.trackData.name || 'GPX 轨迹',
        thumbnail,
        trackData: state.trackData,
        colorScheme: state.colorScheme,
        annotations: state.annotations,
        geoFeatures: state.geoFeatures,
      };
      setHistory(prev => {
        // Avoid duplicates
        if (prev.some(h => h.name === item.name && h.trackData.trackPoints.length === item.trackData.trackPoints.length)) return prev;
        return [item, ...prev];
      });
    }
    setState(initialState);
    bboxRef.current = null;
  }, [state.trackData, state.colorScheme, state.annotations, state.geoFeatures]);

  const handleLoadHistory = useCallback((item: HistoryItem) => {
    bboxRef.current = null;
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

  const stats = state.trackData ? calculateRouteStats(state.trackData) : null;

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>GPX 风格化地图生成器</h1>
      </header>

      <StepFlow currentStep={state.step} onStepChange={handleStepChange} />

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
                title={state.trackData.name || 'GPX 轨迹'}
                stats={stats}
                colorScheme={state.colorScheme}
                canvasRef={canvasRef}
                hasWaypoints={state.trackData.waypoints.length > 0}
                hasAnnotations={state.annotations.length > 0}
              />
            </div>
          </div>

          {/* Side panel */}
          <div style={sidePanelStyle}>
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
              <div style={{ padding: 16 }}>
                <p style={{ color: '#ccc', marginBottom: 16, fontSize: 14 }}>
                  地图已准备就绪，点击下方按钮导出为 PNG 图片。
                </p>
                <button
                  data-testid="export-btn"
                  onClick={handleExport}
                  disabled={state.isLoading}
                  style={primaryBtnStyle}
                >
                  {state.isLoading ? '导出中…' : '导出 PNG'}
                </button>
              </div>
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
