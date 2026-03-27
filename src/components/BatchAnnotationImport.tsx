import { useState, useCallback } from 'react';
import type { GeoPoint, RouteAnnotation, BoundingBox } from '../types';
import { geocodePlaces } from '../services/geocoding-service';
import { findNearestTrackPoint } from './AnnotationEditor';
import { geoToPixel } from '../utils/viewport-calculator';

interface BatchAnnotationImportProps {
  trackPoints: GeoPoint[];
  bbox: BoundingBox;
  canvasSize: { width: number; height: number };
  existingAnnotations: RouteAnnotation[];
  onImport: (annotations: RouteAnnotation[]) => void;
}

export function BatchAnnotationImport({
  trackPoints, bbox, canvasSize, existingAnnotations, onImport,
}: BatchAnnotationImportProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<Array<{
    name: string;
    found: boolean;
    trackPointIndex: number;
    error?: string;
  }>>([]);

  const handleImport = useCallback(async () => {
    const names = text.split('\n').map(s => s.trim()).filter(Boolean);
    if (!names.length) return;

    setLoading(true);
    setProgress(`正在查询 0/${names.length}...`);
    setResults([]);

    const viewbox = { minLon: bbox.minLon, maxLon: bbox.maxLon, minLat: bbox.minLat, maxLat: bbox.maxLat };
    const geoResults = await geocodePlaces(names, viewbox, (done, total) => {
      setProgress(`正在查询 ${done}/${total}...`);
    });

    // 将轨迹点转为像素坐标用于最近点匹配
    const pixelPoints = trackPoints.map(p => geoToPixel(p, bbox, canvasSize));

    const importResults = geoResults.map(r => {
      if (!r.position) {
        return { name: r.name, found: false, trackPointIndex: -1, error: r.error };
      }
      // 将地理编码结果转为像素坐标，找最近轨迹点
      const px = geoToPixel(r.position, bbox, canvasSize);
      const idx = findNearestTrackPoint(px, pixelPoints);
      return { name: r.name, found: true, trackPointIndex: idx };
    });

    setResults(importResults);
    setLoading(false);
    setProgress('');

    // 自动创建标注
    const newAnnotations: RouteAnnotation[] = [];
    for (const r of importResults) {
      if (r.found && r.trackPointIndex >= 0) {
        const pos = trackPoints[r.trackPointIndex];
        newAnnotations.push({
          id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
          position: { lat: pos.lat, lon: pos.lon },
          icon: 'landmark',
          label: r.name,
        });
      }
    }

    if (newAnnotations.length > 0) {
      onImport([...existingAnnotations, ...newAnnotations]);
    }
  }, [text, trackPoints, bbox, canvasSize, existingAnnotations, onImport]);

  const foundCount = results.filter(r => r.found).length;
  const failedCount = results.filter(r => !r.found).length;

  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid #333' }}>
      <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>批量导入标注</div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={'每行一个地点名称，例如：\n天安门\n故宫博物院\n景山公园'}
        rows={5}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 6,
          border: '1px solid #555', background: '#2a2a2a', color: '#eee',
          fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
          fontFamily: 'system-ui',
        }}
      />
      <button
        onClick={handleImport}
        disabled={loading || !text.trim()}
        style={{
          marginTop: 8, padding: '7px 0', width: '100%', borderRadius: 6,
          border: 'none', fontSize: 13, cursor: loading ? 'wait' : 'pointer',
          background: loading ? '#555' : '#4a9eff', color: '#fff',
        }}
      >
        {loading ? progress : '查询并导入'}
      </button>

      {results.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          <span style={{ color: '#66cc88' }}>✓ 成功 {foundCount} 个</span>
          {failedCount > 0 && <span style={{ color: '#ff6b6b', marginLeft: 8 }}>✗ 失败 {failedCount} 个</span>}
          {results.filter(r => !r.found).map((r, i) => (
            <div key={i} style={{ color: '#ff6b6b', marginTop: 2 }}>· {r.name}: {r.error}</div>
          ))}
        </div>
      )}
    </div>
  );
}
