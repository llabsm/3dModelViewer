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

const SYSTEM_PROMPT = `You are a 3D modeling assistant. When the user asks you to create or modify a 3D model, respond with valid Three.js geometry code.

Your response MUST include a code block wrapped in \`\`\`threejs ... \`\`\` tags.

The code inside must be a JavaScript function body that receives these parameters:
- THREE: the Three.js library
- scene: the Three.js scene to add objects to

Rules:
- Use THREE.Mesh, THREE.BoxGeometry, THREE.SphereGeometry, THREE.CylinderGeometry, THREE.ConeGeometry, THREE.TorusGeometry, THREE.TorusKnotGeometry, THREE.PlaneGeometry, etc.
- Use THREE.MeshStandardMaterial with colors and properties
- You can use THREE.Group to group objects
- You can use THREE.Shape and THREE.ExtrudeGeometry for complex shapes
- You can use THREE.LatheGeometry for rotational shapes
- Position, rotate, and scale objects as needed
- ALL objects must be added to the scene via scene.add()
- Do NOT use imports or require statements
- Do NOT reference external files or textures
- Keep the model centered around origin (0, 0, 0)
- Use reasonable scale (most objects should fit within -5 to 5 range on each axis)

Example for a simple house:
\`\`\`threejs
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xddaa77 });
const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x884422 });

// Walls
const walls = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), wallMaterial);
walls.position.y = 1;
scene.add(walls);

// Roof
const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.5, 4), roofMaterial);
roof.position.y = 2.75;
roof.rotation.y = Math.PI / 4;
scene.add(roof);

// Door
const door = new THREE.Mesh(
  new THREE.BoxGeometry(0.6, 1.2, 0.05),
  new THREE.MeshStandardMaterial({ color: 0x553311 })
);
door.position.set(0, 0.6, 1.525);
scene.add(door);
\`\`\`

If the user asks you to modify an existing model, I will provide the current code. Modify it and return the full updated code.

If the user asks a question that is NOT about 3D modeling, respond normally without a code block.

When describing what you created, be concise — 1-2 sentences max.`;

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
  parts.push({ text: userText });

  const contents: GeminiContent[] = [
    ...conversationHistory,
    { role: 'user', parts },
  ];

  const response = await fetch(
    `${GEMINI_API_BASE}/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Extract code from ```threejs ... ``` blocks
  const codeMatch = text.match(/```threejs\n([\s\S]*?)```/);
  const code = codeMatch ? codeMatch[1].trim() : null;

  // Clean text: remove the code block from display text
  const displayText = text
    .replace(/```threejs\n[\s\S]*?```/g, '')
    .trim();

  return { text: displayText || (code ? 'Model updated.' : text), code };
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
