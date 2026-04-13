/**
 * Root key on BACK panel: pill di kiri bawah (sejajar area logo/judul di template),
 * agar konsisten di semua output PDF/ZIP. `monoFamily` dari pipeline server (font terdaftar).
 */
export function drawSerticardRootKeyPill(
  backCtx: {
    save: () => void;
    restore: () => void;
    font: string;
    textAlign: string;
    textBaseline: string;
    measureText: (t: string) => { width: number };
    fillStyle: unknown;
    strokeStyle: unknown;
    lineJoin: string;
    lineWidth: number;
    beginPath: () => void;
    moveTo: (x: number, y: number) => void;
    arcTo: (x1: number, y1: number, x2: number, y2: number, r: number) => void;
    closePath: () => void;
    fill: () => void;
    strokeText: (text: string, x: number, y: number) => void;
    fillText: (text: string, x: number, y: number) => void;
  },
  backW: number,
  backH: number,
  label: string,
  monoFamily: string = "Courier New"
): void {
  const mono = monoFamily;
  /** Inset kiri: selaras kolom teks/logo di serticard (bukan di tengah). */
  const marginX = Math.round(backW * 0.065);
  /** Jarak dari bingkai bawah template. */
  const marginY = Math.round(backH * 0.068);
  const fontSize = Math.max(22, Math.min(40, Math.floor(backW * 0.062)));
  const font = `700 ${fontSize}px ${mono}`;
  backCtx.save();
  backCtx.font = font;
  backCtx.textAlign = "left";
  backCtx.textBaseline = "middle";

  const metrics = backCtx.measureText(label);
  const padH = fontSize * 0.55;
  const padW = fontSize * 0.65;
  const boxW = Math.ceil(metrics.width + padW * 2);
  const boxH = Math.ceil(fontSize + padH * 2);
  const boxX = marginX;
  const boxBottom = backH - marginY;
  const boxY = Math.round(boxBottom - boxH);
  const r = Math.ceil(fontSize * 0.32);

  /* Pill abu-abu cetak (bukan hitam pekat) — dekat referensi desain “light gray” chip */
  backCtx.fillStyle = "rgba(148, 154, 164, 0.94)";
  backCtx.beginPath();
  backCtx.moveTo(boxX + r, boxY);
  backCtx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, r);
  backCtx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, r);
  backCtx.arcTo(boxX, boxY + boxH, boxX, boxY, r);
  backCtx.arcTo(boxX, boxY, boxX + boxW, boxY, r);
  backCtx.closePath();
  backCtx.fill();

  const tx = boxX + padW;
  /** Tengah vertikal kotak — huruf tidak “nempel” ke bawah seperti baseline alphabetic. */
  const ty = boxY + boxH / 2;
  backCtx.lineJoin = "round";
  backCtx.lineWidth = Math.max(1, Math.ceil(fontSize * 0.045));
  backCtx.strokeStyle = "rgba(255,255,255,0.28)";
  backCtx.fillStyle = "#ffffff";
  backCtx.strokeText(label, tx, ty);
  backCtx.fillText(label, tx, ty);
  backCtx.restore();
}
