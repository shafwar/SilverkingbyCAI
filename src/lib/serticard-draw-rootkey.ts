/**
 * Root key on BACK panel: larger bold pill, readable on dark or busy templates.
 * `backCtx` is node-canvas or browser 2D context (typed loosely for compatibility).
 * Pass `monoFamily` from server PDF pipeline (registered OTF) so digits render on Linux.
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
  const padX = Math.round(backW * 0.07);
  const padY = Math.round(backH * 0.07);
  const x = padX;
  const y = backH - padY;
  const fontSize = Math.max(22, Math.min(40, Math.floor(backW * 0.062)));
  const font = `700 ${fontSize}px ${mono}`;
  backCtx.save();
  backCtx.font = font;
  backCtx.textAlign = "left";
  backCtx.textBaseline = "alphabetic";

  const metrics = backCtx.measureText(label);
  const padH = fontSize * 0.55;
  const padW = fontSize * 0.65;
  const boxW = Math.ceil(metrics.width + padW * 2);
  const boxH = Math.ceil(fontSize + padH * 2);
  const boxX = x - padW;
  const boxY = y - boxH + Math.floor(fontSize * 0.15);
  const r = Math.ceil(fontSize * 0.35);

  backCtx.fillStyle = "rgba(0,0,0,0.62)";
  backCtx.beginPath();
  backCtx.moveTo(boxX + r, boxY);
  backCtx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, r);
  backCtx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, r);
  backCtx.arcTo(boxX, boxY + boxH, boxX, boxY, r);
  backCtx.arcTo(boxX, boxY, boxX + boxW, boxY, r);
  backCtx.closePath();
  backCtx.fill();

  const tx = x;
  const ty = y;
  backCtx.lineJoin = "round";
  backCtx.lineWidth = Math.max(2, Math.ceil(fontSize * 0.08));
  backCtx.strokeStyle = "rgba(0,0,0,0.55)";
  backCtx.fillStyle = "#ffffff";
  backCtx.strokeText(label, tx, ty);
  backCtx.fillText(label, tx, ty);
  backCtx.restore();
}
