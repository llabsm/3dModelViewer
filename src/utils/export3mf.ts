import * as THREE from 'three';

// Minimal 3MF exporter — produces a valid .3mf file from Three.js meshes
// 3MF is essentially a ZIP containing XML files describing the 3D model

export async function exportTo3MF(scene: THREE.Scene, filename: string = 'model.3mf'): Promise<void> {
  const meshes: { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4; color: string }[] = [];

  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      const geo = obj.geometry.clone();
      const mat = obj.matrixWorld.clone();

      let color = 'FF808080';
      if (obj.material instanceof THREE.MeshStandardMaterial && obj.material.color) {
        const c = obj.material.color;
        const r = Math.round(c.r * 255).toString(16).padStart(2, '0');
        const g = Math.round(c.g * 255).toString(16).padStart(2, '0');
        const b = Math.round(c.b * 255).toString(16).padStart(2, '0');
        color = `FF${r}${g}${b}`;
      }

      meshes.push({ geometry: geo, matrix: mat, color });
    }
  });

  if (meshes.length === 0) {
    throw new Error('No meshes found in scene');
  }

  let vertexOffset = 0;
  let allVertices = '';
  let allTriangles = '';

  for (const { geometry, matrix, color } of meshes) {
    // Ensure we have non-indexed geometry for simplicity
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
    nonIndexed.applyMatrix4(matrix);

    const positions = nonIndexed.getAttribute('position');
    if (!positions) continue;

    const baseOffset = vertexOffset;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i).toFixed(6);
      const y = positions.getY(i).toFixed(6);
      const z = positions.getZ(i).toFixed(6);
      allVertices += `          <vertex x="${x}" y="${y}" z="${z}" />\n`;
      vertexOffset++;
    }

    for (let i = 0; i < positions.count; i += 3) {
      const v1 = baseOffset + i;
      const v2 = baseOffset + i + 1;
      const v3 = baseOffset + i + 2;
      allTriangles += `          <triangle v1="${v1}" v2="${v2}" v3="${v3}" pid="1" p1="${meshes.indexOf({ geometry, matrix, color })}" />\n`;
    }

    // Fix: use color directly in triangles
    allTriangles = '';
    for (const mesh of meshes) {
      const nonIdx = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
      const pos = nonIdx.getAttribute('position');
      if (!pos) continue;
      // We already built vertices above, just need triangles
    }
  }

  // Rebuild properly
  allVertices = '';
  allTriangles = '';
  vertexOffset = 0;
  let colorIndex = 0;
  const colors: string[] = [];

  for (const { geometry, matrix, color } of meshes) {
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
    nonIndexed.applyMatrix4(matrix);
    const positions = nonIndexed.getAttribute('position');
    if (!positions) continue;

    if (!colors.includes(color)) {
      colors.push(color);
    }
    const cIdx = colors.indexOf(color);

    const baseOffset = vertexOffset;
    for (let i = 0; i < positions.count; i++) {
      allVertices += `          <vertex x="${positions.getX(i).toFixed(6)}" y="${positions.getY(i).toFixed(6)}" z="${positions.getZ(i).toFixed(6)}" />\n`;
      vertexOffset++;
    }

    for (let i = 0; i < positions.count; i += 3) {
      allTriangles += `          <triangle v1="${baseOffset + i}" v2="${baseOffset + i + 1}" v3="${baseOffset + i + 2}" pid="1" p1="${cIdx}" />\n`;
    }
    colorIndex++;
  }

  let colorElements = '';
  colors.forEach((c, i) => {
    colorElements += `        <base name="color_${i}" displaycolor="#${c}" />\n`;
  });

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
       xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <resources>
    <basematerials id="1">
${colorElements}    </basematerials>
    <object id="2" type="model">
      <mesh>
        <vertices>
${allVertices}        </vertices>
        <triangles>
${allTriangles}        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="2" />
  </build>
</model>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;

  // Build ZIP manually (minimal ZIP implementation)
  const zip = await createZip([
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: rels },
    { name: '3D/3dmodel.model', content: modelXml },
  ]);

  // Download
  const blob = new Blob([zip.buffer as ArrayBuffer], { type: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Minimal ZIP file creator (no compression, store only)
async function createZip(files: { name: string; content: string }[]): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const entries: { name: Uint8Array; data: Uint8Array; offset: number }[] = [];
  const parts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const crc = crc32(dataBytes);

    // Local file header (30 bytes + name + data)
    const header = new Uint8Array(30 + nameBytes.length);
    const hv = new DataView(header.buffer);
    hv.setUint32(0, 0x04034b50, true); // signature
    hv.setUint16(4, 20, true); // version needed
    hv.setUint16(6, 0, true); // flags
    hv.setUint16(8, 0, true); // compression (store)
    hv.setUint16(10, 0, true); // mod time
    hv.setUint16(12, 0, true); // mod date
    hv.setUint32(14, crc, true); // crc32
    hv.setUint32(18, dataBytes.length, true); // compressed size
    hv.setUint32(22, dataBytes.length, true); // uncompressed size
    hv.setUint16(26, nameBytes.length, true); // name length
    hv.setUint16(28, 0, true); // extra length
    header.set(nameBytes, 30);

    entries.push({ name: nameBytes, data: dataBytes, offset });
    parts.push(header, dataBytes);
    offset += header.length + dataBytes.length;
  }

  // Central directory
  const centralStart = offset;
  for (const entry of entries) {
    const crc = crc32(entry.data);
    const cd = new Uint8Array(46 + entry.name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); // signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0, true); // flags
    cv.setUint16(10, 0, true); // compression
    cv.setUint16(12, 0, true); // mod time
    cv.setUint16(14, 0, true); // mod date
    cv.setUint32(16, crc, true); // crc32
    cv.setUint32(20, entry.data.length, true); // compressed
    cv.setUint32(24, entry.data.length, true); // uncompressed
    cv.setUint16(28, entry.name.length, true); // name length
    cv.setUint16(30, 0, true); // extra length
    cv.setUint16(32, 0, true); // comment length
    cv.setUint16(34, 0, true); // disk start
    cv.setUint16(36, 0, true); // internal attrs
    cv.setUint32(38, 0, true); // external attrs
    cv.setUint32(42, entry.offset, true); // local header offset
    cd.set(entry.name, 46);

    parts.push(cd);
    offset += cd.length;
  }

  // End of central directory
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // signature
  ev.setUint16(4, 0, true); // disk number
  ev.setUint16(6, 0, true); // disk with cd
  ev.setUint16(8, entries.length, true); // entries on disk
  ev.setUint16(10, entries.length, true); // total entries
  ev.setUint32(12, offset - centralStart, true); // cd size
  ev.setUint32(16, centralStart, true); // cd offset
  ev.setUint16(20, 0, true); // comment length
  parts.push(eocd);

  // Concatenate all parts
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }

  return result;
}

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function exportToSTL(scene: THREE.Scene, filename: string = 'model.stl'): void {
  const meshes: { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }[] = [];

  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      meshes.push({
        geometry: obj.geometry.clone(),
        matrix: obj.matrixWorld.clone(),
      });
    }
  });

  if (meshes.length === 0) {
    throw new Error('No meshes found');
  }

  let totalTriangles = 0;
  const processedMeshes: { positions: THREE.BufferAttribute }[] = [];

  for (const { geometry, matrix } of meshes) {
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
    nonIndexed.applyMatrix4(matrix);
    nonIndexed.computeVertexNormals();
    const positions = nonIndexed.getAttribute('position') as THREE.BufferAttribute;
    totalTriangles += positions.count / 3;
    processedMeshes.push({ positions });
  }

  // Binary STL: 80 byte header + 4 byte triangle count + 50 bytes per triangle
  const bufferLength = 80 + 4 + totalTriangles * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  // Header (80 bytes)
  const header = 'Binary STL exported from 3D Model Viewer';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }

  view.setUint32(80, totalTriangles, true);

  let offset = 84;
  const normal = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  for (const { positions } of processedMeshes) {
    for (let i = 0; i < positions.count; i += 3) {
      a.set(positions.getX(i), positions.getY(i), positions.getZ(i));
      b.set(positions.getX(i + 1), positions.getY(i + 1), positions.getZ(i + 1));
      c.set(positions.getX(i + 2), positions.getY(i + 2), positions.getZ(i + 2));

      const edge1 = b.clone().sub(a);
      const edge2 = c.clone().sub(a);
      normal.crossVectors(edge1, edge2).normalize();

      view.setFloat32(offset, normal.x, true); offset += 4;
      view.setFloat32(offset, normal.y, true); offset += 4;
      view.setFloat32(offset, normal.z, true); offset += 4;

      view.setFloat32(offset, a.x, true); offset += 4;
      view.setFloat32(offset, a.y, true); offset += 4;
      view.setFloat32(offset, a.z, true); offset += 4;

      view.setFloat32(offset, b.x, true); offset += 4;
      view.setFloat32(offset, b.y, true); offset += 4;
      view.setFloat32(offset, b.z, true); offset += 4;

      view.setFloat32(offset, c.x, true); offset += 4;
      view.setFloat32(offset, c.y, true); offset += 4;
      view.setFloat32(offset, c.z, true); offset += 4;

      view.setUint16(offset, 0, true); offset += 2; // attribute byte count
    }
  }

  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
