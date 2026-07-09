import { LAYOUT } from './layout';

/**
 * gibukim 브랜드 디자인 토큰.
 * 로고·썸네일 기준: 피치 배경, 코랄 primary, 골드 accent.
 * 새 색은 하드코딩하지 말고 이 모듈만 사용합니다.
 */
export const colors = {
  /** 화면·카드 뒤 연한 피치/크림 */
  background: '#FDEBD0',
  /** 히어로·강조 영역용 살짝 진한 피치 */
  backgroundMuted: '#F8D9B0',
  /** 카드·버튼 면 */
  surface: '#FFFFFF',
  /** 보조 면 (공지·트랙 등) */
  surfaceMuted: '#F5E6D3',

  /** 코랄/살몬 — CTA, 게이지, 강조 */
  primary: '#FF7F7F',
  primaryPressed: '#F06A6A',
  primarySoft: '#FFE0E0',

  /** 골드/노랑 — 코인·숫자 하이라이트 */
  accent: '#FFB84D',
  accentSoft: '#FFE8C2',

  /** 따뜻한 다크 브라운·그레이 텍스트 */
  text: '#3D2C29',
  textSecondary: '#6B5348',
  textTertiary: '#9A8175',
  textPlaceholder: '#B8A99A',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#3D2C29',

  /** 부스트 활성 상태 */
  success: '#2F9E6B',
  successSoft: '#E6F7EE',

  /** 보더·디바이더 */
  border: '#E8D5C4',
  borderStrong: '#D4B8A0',

  /** 게이지 트랙 */
  gaugeTrack: '#E8D5C4',
  /** 게이지 fill — primary와 동일 계열 */
  gaugeFill: '#FF7F7F',
} as const;

export type ThemeColor = (typeof colors)[keyof typeof colors];

export const theme = {
  colors,
  layout: LAYOUT,
} as const;

export { LAYOUT };
