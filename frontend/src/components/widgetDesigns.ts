import type { CSSProperties } from 'react';

export type WidgetDesign = {
  shape: 'circle' | 'triangle' | 'square';
  base: string;
  shade: string;
  highlight: string;
  tint: string;
};

const designsByCode: Record<string, WidgetDesign> = {
  R01: {
    shape: 'circle',
    base: '#d9472f',
    shade: '#a8311d',
    highlight: '#f0806a',
    tint: '#f7e5de',
  },
  G01: {
    shape: 'triangle',
    base: '#2f8a5b',
    shade: '#1f6542',
    highlight: '#62b98a',
    tint: '#e1eee4',
  },
  B01: {
    shape: 'square',
    base: '#2f67c9',
    shade: '#1f4b98',
    highlight: '#6497e8',
    tint: '#e0e8f5',
  },
};

const fallbackDesign: WidgetDesign = {
  shape: 'circle',
  base: '#8a8478',
  shade: '#625d54',
  highlight: '#b3ada2',
  tint: '#eeeae2',
};

export function widgetDesignFor(code: string): WidgetDesign {
  return designsByCode[code] ?? fallbackDesign;
}

export function widgetTintStyle(code: string): CSSProperties {
  return { '--widget-tint': widgetDesignFor(code).tint } as CSSProperties;
}
