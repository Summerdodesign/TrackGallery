import { useRef, useState, useCallback } from 'react';
import type { TrackData } from '../types';
import { validateUploadFile } from '../utils/upload-validator';
import { GPXParser } from '../utils/gpx-parser';

export interface UploadProps {
  onUpload: (trackData: TrackData) => void;
  onError?: (error: string) => void;
  isLoading?: boolean;
}

export function Upload({ onUpload, onError, isLoading = false }: UploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loading = isLoading || parsing;

  const processFile = useCallback(async (file: File) => {
    setError(null);

    // Step 1: validate file extension & size
    const validation = validateUploadFile(file);
    if (!validation.valid) {
      const msg = validation.errors.join('；');
      setError(msg);
      onError?.(msg);
      return;
    }

    setParsing(true);
    try {
      const text = await file.text();
      const parser = new GPXParser();

      // Step 2: validate GPX content
      const gpxValidation = parser.validate(text);
      if (!gpxValidation.valid) {
        const msg = gpxValidation.errors.join('；');
        setError(msg);
        onError?.(msg);
        return;
      }

      // Step 3: parse GPX
      const trackData = parser.parse(text);
      onUpload(trackData);
    } catch {
      const msg = '文件读取失败，请重试';
      setError(msg);
      onError?.(msg);
    } finally {
      setParsing(false);
    }
  }, [onUpload, onError]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // reset so same file can be re-selected
    e.target.value = '';
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleClick = useCallback(() => {
    if (!loading) inputRef.current?.click();
  }, [loading]);

  return (
    <div
      data-testid="upload-zone"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? '#4a9eff' : '#555'}`,
        borderRadius: 12,
        padding: '48px 24px',
        textAlign: 'center',
        cursor: loading ? 'wait' : 'pointer',
        background: isDragging ? 'rgba(74,158,255,0.05)' : 'transparent',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".gpx"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        data-testid="file-input"
      />

      {loading ? (
        <div data-testid="loading-indicator" style={{ color: '#aaa' }}>
          <div style={spinnerStyle} />
          <p style={{ marginTop: 12 }}>正在解析 GPX 文件…</p>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 18, color: '#ccc', margin: 0 }}>
            📂 点击选择或拖拽 GPX 文件到此处
          </p>
          <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
            支持 .gpx 格式，最大 10MB
          </p>
        </div>
      )}

      {error && (
        <p data-testid="error-message" style={{ color: '#ff6b6b', marginTop: 12, fontSize: 14 }}>
          {error}
        </p>
      )}
    </div>
  );
}

const spinnerStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: '3px solid #333',
  borderTop: '3px solid #4a9eff',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  margin: '0 auto',
};

// Inject keyframes once
if (typeof document !== 'undefined') {
  const styleId = 'upload-spinner-keyframes';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}
