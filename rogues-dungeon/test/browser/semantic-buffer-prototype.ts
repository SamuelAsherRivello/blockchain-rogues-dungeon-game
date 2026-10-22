export interface SemanticInput { width: number; height: number; terrain: Uint16Array; walls: Uint16Array; objects: Uint16Array }
export function semanticBuffer(input: SemanticInput) {
  const bytes = new Uint8ClampedArray(input.width * input.height * 4);
  for (let i=3;i<bytes.length;i+=4) bytes[i]=255;
  const paint = (points: Uint16Array, color: number[]) => {
    for(let i=0;i<points.length;i+=2) {
      const x=points[i], y=points[i+1]; if(x>=input.width || y>=input.height) continue;
      const offset=(y*input.width+x)*4; bytes[offset]=color[0];bytes[offset+1]=color[1];bytes[offset+2]=color[2];
    }
  };
  paint(input.terrain,[111,113,128]); paint(input.walls,[41,40,55]); paint(input.objects,[118,200,120]);
  return bytes;
}
export function createRevisionGate<T>() {
  let revision=0, value:T|undefined;
  return { begin:()=>++revision, accept:(incoming:number,next:T)=>{if(incoming!==revision)return false;value=next;return true;}, current:()=>value };
}
