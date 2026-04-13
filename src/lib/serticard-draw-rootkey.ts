/**
 * Root key on BACK panel: bold pill centered along the bottom safe band (readable on busy templates).
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
  /** Side safe inset so the pill never hugs the spine / outer trim awkwardly. */
  const marginX = Math.round(backW * 0.055);
  /** Slightly more inset from bottom so it sits inside the inner frame line on templates. */
  const marginY = Math.round(backH * 0.072);
  const anchorX = backW / 2;
  const anchorY = backH - marginY;
  const fontSize = Math.max(22, Math.min(40, Math.floor(backW * 0.062)));
  const font = `700 ${fontSize}px ${mono}`;
  backCtx.save();
  backCtx.font = font;
  backCtx.textAlign = "center";
  backCtx.textBaseline = "alphabetic";

  const metrics = backCtx.measureText(label);
  const padH = fontSize * 0.55;
  const padW = fontSize * 0.65;
  const boxW = Math.ceil(metrics.width + padW * 2);
  const boxH = Math.ceil(fontSize + padH * 2);
  let boxX = Math.round(anchorX - boxW / 2);
  const minX = marginX;
  const maxX = backW - marginX - boxW;
  if (boxX < minX) boxX = minX;
  if (boxX > maxX) boxX = Math.max(minX, maxX);
  const textX = boxX + boxW / 2;
  const boxY = anchorY - boxH + Math.floor(fontSize * 0.15);
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

  const tx = textX;
  const ty = anchorY;
  backCtx.lineJoin = "round";
  backCtx.lineWidth = Math.max(2, Math.ceil(fontSize * 0.08));
  backCtx.strokeStyle = "rgba(0,0,0,0.55)";
  backCtx.fillStyle = "#ffffff";
  backCtx.strokeText(label, tx, ty);
  backCtx.fillText(label, tx, ty);
  backCtx.restore();
}
