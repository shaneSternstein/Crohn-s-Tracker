import { useEffect, useRef, useState } from 'react';

interface Detector { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> }
type DetectorCtor = new (opts?: { formats?: string[] }) => Detector;
const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

/** Bottom sheet that scans a barcode with the camera (where the browser supports it) or takes a typed number. */
export default function BarcodeSheet({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState(Ctor ? '' : 'Camera scanning is not available in this browser. Type the number instead.');

  useEffect(() => {
    if (!Ctor) return;
    let stopped = false;
    let timer: number | undefined;
    let stream: MediaStream | undefined;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        const detector = new Ctor({ formats: FORMATS });
        const tick = async () => {
          if (stopped) return;
          try {
            const found = await detector.detect(v);
            if (found[0]?.rawValue) {
              stopped = true;
              onCode(found[0].rawValue);
              return;
            }
          } catch {
            /* ignore single-frame errors */
          }
          timer = window.setTimeout(tick, 250);
        };
        void tick();
      } catch {
        setMsg('Could not open the camera. Type the number instead.');
      }
    })();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Scan barcode" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <strong>Scan barcode</strong>
          <button className="chip" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {Ctor && <video ref={video} className="scan-video" playsInline muted />}
        {msg && <p className="empty">{msg}</p>}
        <input inputMode="numeric" placeholder="Or type the barcode number" value={typed} onChange={(e) => setTyped(e.target.value)} />
        <button className="btn" disabled={!typed.trim()} onClick={() => onCode(typed)}>Look up</button>
      </div>
    </div>
  );
}
