import { useState, useCallback, useEffect } from 'react';
import type { GeoPoint, PixelPoint, RouteAnnotation, AnnotationIcon } from '../types';
import { ANNOTATION_ICONS } from '../constants';
import { isValidAnnotationText } from '../utils/annotation-validator';

export interface AnnotationEditorProps {
  annotations: RouteAnnotation[];
  trackPoints: GeoPoint[];
  onChange: (annotations: RouteAnnotation[]) => void;
  /** Called when add mode changes, so parent can wire canvas clicks */
  onAddModeChange?: (addMode: boolean) => void;
  /** Parent calls this when user clicks on the canvas in add mode */
  pendingTrackPointIndex?: number | null;
  /** Parent resets this after it's consumed */
  onPendingConsumed?: () => void;
}

/** Emoji mapping for annotation icons */
const ICON_EMOJI: Record<AnnotationIcon, string> = {
  landmark: '📍',
  restaurant: '🍴',
  supply: '⛽',
  scenic: '🏞️',
  mountain: '⛰️',
  start: '🏁',
  finish: '🎯',
  camp: '⛺',
  photo: '📷',
  warning: '⚠️',
  water: '💧',
  rest: '🪑',
};

/**
 * Find the index of the nearest track point to a given click position using Euclidean distance.
 */
export function findNearestTrackPoint(
  clickPosition: PixelPoint,
  trackPoints: PixelPoint[],
): number {
  if (trackPoints.length === 0) return -1;

  let minDist = Infinity;
  let minIndex = 0;

  for (let i = 0; i < trackPoints.length; i++) {
    const dx = trackPoints[i].x - clickPosition.x;
    const dy = trackPoints[i].y - clickPosition.y;
    const dist = dx * dx + dy * dy; // skip sqrt for comparison
    if (dist < minDist) {
      minDist = dist;
      minIndex = i;
    }
  }

  return minIndex;
}


interface EditState {
  trackPointIndex: number;
  icon: AnnotationIcon;
  label: string;
  /** If set, we are editing an existing annotation */
  editingId: string | null;
}

export function AnnotationEditor({ annotations, trackPoints, onChange, onAddModeChange, pendingTrackPointIndex, onPendingConsumed }: AnnotationEditorProps) {
  const [addMode, setAddMode] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);

  const toggleAddMode = useCallback(() => {
    setAddMode((prev) => {
      const next = !prev;
      onAddModeChange?.(next);
      return next;
    });
    setEditState(null);
  }, [onAddModeChange]);

  // React to parent sending a pending track point click
  useEffect(() => {
    if (pendingTrackPointIndex != null && addMode && pendingTrackPointIndex >= 0 && pendingTrackPointIndex < trackPoints.length) {
      setEditState({
        trackPointIndex: pendingTrackPointIndex,
        icon: 'landmark',
        label: '',
        editingId: null,
      });
      onPendingConsumed?.();
    }
  }, [pendingTrackPointIndex, addMode, trackPoints.length, onPendingConsumed]);

  const handleEditAnnotation = useCallback(
    (annotation: RouteAnnotation) => {
      // Find the closest track point for this annotation
      const idx = trackPoints.findIndex(
        (p) => p.lat === annotation.position.lat && p.lon === annotation.position.lon,
      );
      setEditState({
        trackPointIndex: idx >= 0 ? idx : 0,
        icon: annotation.icon,
        label: annotation.label,
        editingId: annotation.id,
      });
    },
    [trackPoints],
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      onChange(annotations.filter((a) => a.id !== id));
    },
    [annotations, onChange],
  );

  const handleSave = useCallback(() => {
    if (!editState) return;
    if (!isValidAnnotationText(editState.label)) return;

    if (editState.editingId) {
      // Update existing
      onChange(
        annotations.map((a) =>
          a.id === editState.editingId
            ? { ...a, icon: editState.icon, label: editState.label }
            : a,
        ),
      );
    } else {
      // Create new
      const position = trackPoints[editState.trackPointIndex];
      if (!position) return;
      const newAnnotation: RouteAnnotation = {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        position: { lat: position.lat, lon: position.lon },
        icon: editState.icon,
        label: editState.label,
      };
      onChange([...annotations, newAnnotation]);
    }
    setEditState(null);
  }, [editState, annotations, trackPoints, onChange]);

  const handleCancel = useCallback(() => {
    setEditState(null);
  }, []);

  return (
    <div data-testid="annotation-editor" style={{ padding: 16 }}>
      {/* Add mode toggle */}
      <button
        data-testid="add-mode-toggle"
        onClick={toggleAddMode}
        style={{
          padding: '8px 16px',
          borderRadius: 6,
          border: addMode ? '2px solid #4a9eff' : '1px solid #555',
          background: addMode ? 'rgba(74,158,255,0.15)' : '#2a2a2a',
          color: addMode ? '#4a9eff' : '#ccc',
          cursor: 'pointer',
          fontSize: 14,
          marginBottom: 16,
        }}
      >
        {addMode ? '✕ 退出添加模式' : '＋ 添加标注'}
      </button>

      {addMode && !editState && (
        <p data-testid="add-mode-hint" style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
          点击路线上的点以添加标注
        </p>
      )}

      {/* Edit panel */}
      {editState && (
        <EditPanel
          editState={editState}
          onIconChange={(icon) => setEditState({ ...editState, icon })}
          onLabelChange={(label) => setEditState({ ...editState, label })}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {/* Existing annotations list */}
      {annotations.length > 0 && (
        <div data-testid="annotation-list" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, color: '#aaa', marginBottom: 8 }}>已有标注</div>
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              data-testid={`annotation-item-${annotation.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 6,
                background: '#2a2a2a',
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 18 }}>{ICON_EMOJI[annotation.icon]}</span>
              <span style={{ flex: 1, color: '#ccc', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {annotation.label || '(无文字)'}
              </span>
              <button
                data-testid={`edit-btn-${annotation.id}`}
                onClick={() => handleEditAnnotation(annotation)}
                style={{ background: 'none', border: 'none', color: '#4a9eff', cursor: 'pointer', fontSize: 13 }}
              >
                编辑
              </button>
              <button
                data-testid={`delete-btn-${annotation.id}`}
                onClick={() => handleDeleteAnnotation(annotation.id)}
                style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: 13 }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Internal edit panel sub-component */
function EditPanel({
  editState,
  onIconChange,
  onLabelChange,
  onSave,
  onCancel,
}: {
  editState: EditState;
  onIconChange: (icon: AnnotationIcon) => void;
  onLabelChange: (label: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const labelValid = isValidAnnotationText(editState.label);

  return (
    <div data-testid="edit-panel" style={{ padding: 12, borderRadius: 8, border: '1px solid #555', background: '#1e1e1e', marginBottom: 12 }}>
      {/* Icon selection grid */}
      <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>选择图标</div>
      <div data-testid="icon-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {ANNOTATION_ICONS.map(({ type, label }) => (
          <button
            key={type}
            data-testid={`icon-option-${type}`}
            onClick={() => onIconChange(type)}
            title={label}
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              borderRadius: 6,
              border: editState.icon === type ? '2px solid #4a9eff' : '1px solid #444',
              background: editState.icon === type ? 'rgba(74,158,255,0.15)' : '#2a2a2a',
              cursor: 'pointer',
            }}
          >
            {ICON_EMOJI[type]}
          </button>
        ))}
      </div>

      {/* Text input */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 4 }}>文字说明（最多 50 字符）</div>
        <input
          data-testid="label-input"
          type="text"
          maxLength={50}
          value={editState.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="输入标注文字…"
          style={{
            width: '100%',
            padding: '6px 10px',
            borderRadius: 4,
            border: labelValid ? '1px solid #555' : '1px solid #ff6b6b',
            background: '#2a2a2a',
            color: '#eee',
            fontSize: 13,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ fontSize: 11, color: '#666', marginTop: 2, textAlign: 'right' }}>
          {editState.label.length}/50
        </div>
      </div>

      {/* Save / Cancel */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          data-testid="save-btn"
          onClick={onSave}
          style={{
            flex: 1,
            padding: '6px 0',
            borderRadius: 6,
            border: 'none',
            background: '#4a9eff',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          保存
        </button>
        <button
          data-testid="cancel-btn"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '6px 0',
            borderRadius: 6,
            border: '1px solid #555',
            background: 'transparent',
            color: '#ccc',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          取消
        </button>
      </div>
    </div>
  );
}
