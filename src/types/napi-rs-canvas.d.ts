declare module "@napi-rs/canvas" {
  // Minimal type declarations to satisfy TypeScript.
  // Runtime types come from the library; we only need the shapes we use.
  export function createCanvas(width: number, height: number): any;
  export function loadImage(source: any): Promise<any>;
}


