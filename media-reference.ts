export const MAX_REFERENCE_BYTES = 1_500_000;
export function parseReferenceImage(value: unknown): {mimeType:string;data:string} | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || value.length > MAX_REFERENCE_BYTES * 1.4) throw new Error('Imagem de referência muito grande.');
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error('Envie uma imagem JPEG, PNG ou WebP por upload.');
  const bytes = Buffer.from(match[2], 'base64');
  const valid = match[1] === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : match[1] === 'image/png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
  if (!valid || bytes.length > MAX_REFERENCE_BYTES) throw new Error('Arquivo de imagem inválido.');
  return {mimeType:match[1],data:match[2]};
}
