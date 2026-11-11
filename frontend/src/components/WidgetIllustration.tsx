import { widgetDesignFor, type WidgetDesign } from './widgetDesigns';

const rivets = [
  [31, 33],
  [89, 33],
  [31, 81],
  [89, 81],
] as const;

export function WidgetIllustration({ code }: { code: string }) {
  const design = widgetDesignFor(code);

  return (
    <svg className="widget-illustration" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <ellipse cx="60" cy="103" rx="38" ry="5" fill="#1c1d1f" opacity="0.1" />
      <rect x="20" y="30" width="80" height="70" rx="16" fill={design.shade} />
      <rect x="20" y="22" width="80" height="70" rx="16" fill={design.base} />
      <rect x="34" y="26.5" width="52" height="2.5" rx="1.25" fill="#ffffff" opacity="0.24" />
      {rivets.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.4" fill={design.shade} opacity="0.6" />
      ))}
      <WidgetGlyph design={design} />
    </svg>
  );
}

function WidgetGlyph({ design }: { design: WidgetDesign }) {
  if (design.shape === 'triangle') {
    return (
      <g strokeLinejoin="round">
        <path d="M60 36 80 70H40Z" fill={design.shade} stroke={design.shade} strokeWidth="8" />
        <path
          d="M60 37.5 76.5 66H43.5Z"
          fill={design.highlight}
          stroke={design.highlight}
          strokeWidth="4"
        />
      </g>
    );
  }

  if (design.shape === 'square') {
    return (
      <g>
        <rect x="41" y="38" width="38" height="38" rx="8" fill={design.shade} />
        <rect x="45" y="40" width="30" height="30" rx="5.5" fill={design.highlight} />
      </g>
    );
  }

  return (
    <g>
      <circle cx="60" cy="57" r="20" fill={design.shade} />
      <circle cx="60" cy="55" r="15.5" fill={design.highlight} />
      <rect x="58.25" y="42" width="3.5" height="10" rx="1.75" fill={design.shade} />
    </g>
  );
}
