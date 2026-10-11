import type { CSSProperties } from 'react';

interface Props {
  size?: number;
  /** 'light' stands out on indigo backgrounds. */
  variant?: 'indigo' | 'light';
  /** rest: the icon. once: plays the tide-settle (inverted icon becomes the icon). loop: oscillates, for loading. */
  mode?: 'rest' | 'once' | 'loop';
}

/** The app icon drawn in CSS, so it can animate. Sizes use em, where 1em is 1% of the icon. */
export default function TideMark({ size = 104, variant = 'indigo', mode = 'rest' }: Props) {
  return (
    <div className={`tm tm-${variant} tm-${mode}`} style={{ width: size, height: size, fontSize: size / 100 } as CSSProperties} aria-hidden="true">
      <i className="tm-b tm-b1" />
      <i className="tm-b tm-b2" />
      <i className="tm-b tm-b3" />
      <i className="tm-dot" />
    </div>
  );
}
