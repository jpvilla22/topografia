import * as THREE from 'three';

export namespace CanvasLogger {
  export let width = 0;
  export let height = 0;

  const PX_PER_UNIT = 300;
  const FONT_SIZE = 24;
  const BORDER_SIZE = 5;
  const lines: string[] = [];
  let context: CanvasRenderingContext2D;
  let texture: THREE.CanvasTexture;

  export function buildMaterial(geometry: THREE.BufferGeometry): THREE.MeshBasicMaterial {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.style.visibility = 'hidden';
    canvas.style.display = 'none';

    if (!geometry.boundingBox) geometry.computeBoundingBox();
    width = (geometry.boundingBox.max.x - geometry.boundingBox.min.x) * PX_PER_UNIT;
    height = (geometry.boundingBox.max.y - geometry.boundingBox.min.y) * PX_PER_UNIT;

    canvas.width = width;
    canvas.height = height;

    context = canvas.getContext('2d');
    context.font = `${FONT_SIZE}px Monospace`;

    texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    draw();

    const material = new THREE.MeshBasicMaterial({ map: texture });
    return material;
  }

  export function log(...msgs: any[]) {
    const message = msgs.map(String).join(' ');
    lines.push(...message.split('\n'));

    const maxLines = Math.floor((height - 2 * BORDER_SIZE) / FONT_SIZE);
    if (lines.length > maxLines) lines.splice(0, lines.length - maxLines);

    if (context) draw();
  }

  function draw() {
    // Clear
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);
    context.fillStyle = 'white';
    context.fillRect(BORDER_SIZE, BORDER_SIZE, width - BORDER_SIZE * 2, height - BORDER_SIZE * 2);
    context.fillStyle = 'black';

    // Write lines
    lines.forEach((line, idx) => {
      context.fillText(line, 10, FONT_SIZE * (idx + 1));
    });

    texture.needsUpdate = true;
  }
}

export function canvasLog(...msgs: any[]) {
  CanvasLogger.log(...msgs);
}

export function error(...msgs: string[]) {
  console.error(...msgs);
}

export function warn(...msgs: string[]) {
  console.warn(...msgs);
}

export function info(...msgs: any[]) {
  console.log(...msgs);
}
