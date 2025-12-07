import { RecordingPart } from './types';
import { logger } from '../logger';

class PlaylistGenerator {
  generateM3U8(parts: RecordingPart[]): string {
    const validParts = parts.filter(p => p.status === 'completed' && p.publicUrl);
    
    if (validParts.length === 0) {
      logger.warn('No valid parts to generate playlist');
      return '';
    }

    let playlist = '#EXTM3U\n';
    playlist += '#EXT-X-VERSION:3\n';
    playlist += '#EXT-X-PLAYLIST-TYPE:VOD\n';
    
    const targetDuration = Math.max(...validParts.map(p => Math.ceil((p.duration || 0) / 1000)));
    playlist += `#EXT-X-TARGETDURATION:${targetDuration}\n`;
    playlist += '#EXT-X-MEDIA-SEQUENCE:0\n\n';

    for (const part of validParts) {
      const durationSec = (part.duration || 0) / 1000;
      playlist += `#EXTINF:${durationSec.toFixed(3)},Part ${part.partNumber}\n`;
      playlist += `${part.publicUrl}\n`;
    }

    playlist += '#EXT-X-ENDLIST\n';

    logger.info(`Generated M3U8 playlist with ${validParts.length} parts`);
    return playlist;
  }

  generateJSON(parts: RecordingPart[]): object {
    const validParts = parts.filter(p => p.status === 'completed');
    
    return {
      version: '1.0',
      type: 'recording',
      parts: validParts.map(p => ({
        number: p.partNumber,
        fileName: p.fileName,
        duration: p.duration,
        url: p.publicUrl,
        startTime: p.startTime,
        endTime: p.endTime,
      })),
      totalParts: validParts.length,
      totalDuration: validParts.reduce((sum, p) => sum + (p.duration || 0), 0),
      generatedAt: new Date().toISOString(),
    };
  }

  generateHTML(title: string, parts: RecordingPart[]): string {
    const validParts = parts.filter(p => p.status === 'completed' && p.publicUrl);
    
    let html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .parts { list-style: none; padding: 0; }
    .part { background: white; margin: 10px 0; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .part a { color: #0066cc; text-decoration: none; }
    .part a:hover { text-decoration: underline; }
    .meta { color: #666; font-size: 14px; margin-top: 5px; }
  </style>
</head>
<body>
  <h1>📹 ${title}</h1>
  <p>Всего частей: ${validParts.length}</p>
  <ul class="parts">`;

    for (const part of validParts) {
      const durationMin = Math.round((part.duration || 0) / 60000);
      html += `
    <li class="part">
      <a href="${part.publicUrl}" target="_blank">Часть ${part.partNumber}</a>
      <div class="meta">Длительность: ~${durationMin} мин</div>
    </li>`;
    }

    html += `
  </ul>
</body>
</html>`;

    return html;
  }
}

export const playlistGenerator = new PlaylistGenerator();
