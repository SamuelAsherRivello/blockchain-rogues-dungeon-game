import { semanticBuffer, type SemanticInput } from "./semantic-buffer-prototype.ts";
self.onmessage = (event: MessageEvent<SemanticInput & {revision:number}>) => {
  const started=performance.now(), bytes=semanticBuffer(event.data);
  self.postMessage({revision:event.data.revision,elapsed:performance.now()-started,buffer:bytes.buffer}, {transfer:[bytes.buffer]});
};
