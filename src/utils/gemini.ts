const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}

const SYSTEM_PROMPT = `You are a precise 3D modeling assistant that generates Three.js geometry code.

RESPONSE FORMAT:
- Always include a code block wrapped in \`\`\`threejs ... \`\`\`
- Before the code block, write 1 sentence max describing what you made.
- NEVER include the code in your text explanation.

CODE REQUIREMENTS:
The code receives two variables: THREE (the Three.js library) and scene (a THREE.Group to add objects to).

GEOMETRY RULES:
- Use THREE.Shape + THREE.ExtrudeGeometry for letters, logos, and flat shapes that need depth.
- Use THREE.CylinderGeometry, THREE.SphereGeometry, THREE.BoxGeometry, THREE.ConeGeometry, THREE.TorusGeometry, THREE.TorusKnotGeometry for primitives.
- Use THREE.LatheGeometry for rotationally symmetric objects (vases, bottles, chess pieces).
- Use THREE.TubeGeometry + THREE.CatmullRomCurve3 for pipes, tubes, curved paths.
- Use THREE.BufferGeometry with manual vertices for complex organic shapes.
- Use THREE.MeshStandardMaterial with color, roughness, metalness.
- Give every mesh a .name property.
- Center models around origin (0,0,0). Keep within -5 to 5 range.
- Add objects via scene.add().
- Do NOT use imports, require, or external files.

LETTER / TEXT SHAPES:
When asked to create a letter or text shape, you MUST draw the actual outline of that letter using THREE.Shape with moveTo/lineTo/quadraticCurveTo/bezierCurveTo, then extrude it. Think carefully about what the letter looks like. For example:
- "S" is a sinuous curve, not a straight shape. Use bezier curves.
- "O" is a circle with a hole (use shape.holes).
- "A" has a triangular top with a crossbar and a hole.
Trace the outline carefully — imagine drawing the letter on paper, then creating a path that follows its contour.

EXAMPLE — Letter "S":
\`\`\`threejs
const shape = new THREE.Shape();
// Draw an S-curve outline
shape.moveTo(1.2, 0);
shape.lineTo(0.3, 0);
shape.quadraticCurveTo(-0.8, 0, -0.8, 0.8);
shape.quadraticCurveTo(-0.8, 1.6, 0.3, 1.6);
shape.lineTo(0.5, 1.6);
shape.quadraticCurveTo(1.2, 1.6, 1.2, 2.3);
shape.quadraticCurveTo(1.2, 3.0, 0.3, 3.0);
shape.lineTo(-0.8, 3.0);
shape.lineTo(-0.8, 2.6);
shape.lineTo(0.3, 2.6);
shape.quadraticCurveTo(0.8, 2.6, 0.8, 2.3);
shape.quadraticCurveTo(0.8, 1.95, 0.3, 1.95);
shape.lineTo(-0.3, 1.95);
shape.quadraticCurveTo(-1.2, 1.95, -1.2, 1.15);
shape.quadraticCurveTo(-1.2, 0.4, -0.3, 0.4);
shape.lineTo(0.8, 0.4);
shape.quadraticCurveTo(1.2, 0.4, 1.2, 0);

const extrudeSettings = { depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 };
const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
geometry.center();
const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.3, metalness: 0.6 }));
mesh.name = "letter_S";
scene.add(mesh);
\`\`\`

EXAMPLE — Coffee mug:
\`\`\`threejs
// Body via LatheGeometry
const bodyPoints = [
  new THREE.Vector2(0, 0),
  new THREE.Vector2(1.2, 0),
  new THREE.Vector2(1.3, 0.3),
  new THREE.Vector2(1.3, 2.5),
  new THREE.Vector2(1.2, 2.8),
  new THREE.Vector2(1.1, 2.8),
  new THREE.Vector2(1.1, 0.3),
  new THREE.Vector2(1.0, 0.15),
  new THREE.Vector2(0, 0.15),
];
const body = new THREE.Mesh(
  new THREE.LatheGeometry(bodyPoints, 32),
  new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 })
);
body.name = "mug_body";
scene.add(body);

// Handle via TubeGeometry
const handleCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(1.3, 2.2, 0),
  new THREE.Vector3(2.0, 1.8, 0),
  new THREE.Vector3(2.0, 1.0, 0),
  new THREE.Vector3(1.3, 0.6, 0),
]);
const handle = new THREE.Mesh(
  new THREE.TubeGeometry(handleCurve, 20, 0.1, 8, false),
  new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 })
);
handle.name = "mug_handle";
scene.add(handle);
\`\`\`

When modifying an existing model, return the FULL updated code, not just the changed parts.`;

export async function generateModel(
  apiKey: string,
  prompt: string,
  currentCode: string | null,
  imageBase64: string | null,
  conversationHistory: GeminiContent[]
): Promise<{ text: string; code: string | null }> {
  const parts: GeminiPart[] = [];

  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    });
  }

  let userText = prompt;
  if (currentCode) {
    userText += `\n\nCurrent model code:\n\`\`\`threejs\n${currentCode}\n\`\`\``;
  }
  if (imageBase64 && !prompt.trim()) {
    userText = 'Create a 3D model based on this reference image. Study the image carefully and reproduce its shape as accurately as possible using Three.js geometry.';
    if (currentCode) {
      userText += `\n\nCurrent model code:\n\`\`\`threejs\n${currentCode}\n\`\`\``;
    }
  }
  parts.push({ text: userText });

  const contents: GeminiContent[] = [
    ...conversationHistory,
    { role: 'user', parts },
  ];

  const response = await fetch(
    `${GEMINI_API_BASE}/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 16384,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const data = await response.json();

  // Gemini can return multiple parts
  let fullText = '';
  const responseParts = data.candidates?.[0]?.content?.parts;
  if (Array.isArray(responseParts)) {
    for (const part of responseParts) {
      if (part.text) fullText += part.text;
    }
  }

  if (!fullText) {
    throw new Error('Empty response from Gemini');
  }

  // Extract code — handle various markdown formats
  let code: string | null = null;

  // Try threejs first
  const threejsMatch = fullText.match(/```threejs\s*\n?([\s\S]*?)```/);
  if (threejsMatch) {
    code = threejsMatch[1].trim();
  }

  // Try js/javascript
  if (!code) {
    const jsMatch = fullText.match(/```(?:js|javascript)\s*\n?([\s\S]*?)```/);
    if (jsMatch && jsMatch[1].includes('THREE.')) {
      code = jsMatch[1].trim();
    }
  }

  // Try bare code block that contains THREE
  if (!code) {
    const bareMatch = fullText.match(/```\s*\n?([\s\S]*?)```/);
    if (bareMatch && bareMatch[1].includes('THREE.')) {
      code = bareMatch[1].trim();
    }
  }

  // Strip ALL code blocks from display text
  const displayText = fullText
    .replace(/```[\w]*\s*\n?[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    text: displayText || (code ? 'Model updated.' : fullText),
    code,
  };
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models?key=${apiKey}`
    );
    return response.ok;
  } catch {
    return false;
  }
}
