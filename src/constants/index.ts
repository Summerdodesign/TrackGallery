import type { AnnotationIcon, ColorScheme } from '../types';

/** 3 套预设配色方案 */
export const PRESET_SCHEMES: ColorScheme[] = [
  {
    id: 'dark-neon',
    name: '暗夜荧光',
    background: '#1a1a2e',
    routeColor: '#39FF14',
    routeGlow: '#39FF1466',
    roadColor: '#333333',
    waterColor: '#2a2a4a',
    waypointColor: '#FF6B35',
    titleColor: '#FFFFFF',
  },
  {
    id: 'midnight-blue',
    name: '午夜蓝',
    background: '#0d1b2a',
    routeColor: '#00D4FF',
    routeGlow: '#00D4FF66',
    roadColor: '#1b2838',
    waterColor: '#1a3a5c',
    waypointColor: '#FFD700',
    titleColor: '#E0E0E0',
  },
  {
    id: 'warm-ember',
    name: '暖焰',
    background: '#1a1210',
    routeColor: '#FF6B35',
    routeGlow: '#FF6B3566',
    roadColor: '#3a2a20',
    waterColor: '#2a1a10',
    waypointColor: '#FFD700',
    titleColor: '#FFF0E0',
  },
];

/** 12 种预设标注图标类型 */
export const ANNOTATION_ICONS: { type: AnnotationIcon; label: string }[] = [
  { type: 'landmark', label: '地标' },
  { type: 'restaurant', label: '餐饮' },
  { type: 'supply', label: '补给站' },
  { type: 'scenic', label: '景点' },
  { type: 'mountain', label: '山峰' },
  { type: 'start', label: '起点' },
  { type: 'finish', label: '终点' },
  { type: 'camp', label: '营地' },
  { type: 'photo', label: '拍照点' },
  { type: 'warning', label: '警告' },
  { type: 'water', label: '水源' },
  { type: 'rest', label: '休息点' },
];
