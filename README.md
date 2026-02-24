# Prompt
# 3d model creator and editor and viewer

## Goal

To have a 3d model creator and editor and viewer based on user prompt and/or image.

1. The user can type what they want to generate
2. And, the user can upload an image to serve as guideline
3. With that information, the system will generate a 3mf 3d model
4. And the system will allow the user to visualize the 3mf model as well
5. Then, the user can ask the agent to change parts of the model
6. And, the user will have a wysiwyg editor for the 3mf model as well
7. After editing the model, the user should be able to download the .3mf file so they can send that to the printer

## Rules and limitations

1. To interact with the agent, the user will have to provide an api key
2. The agent will run Gemini 3.1 Pro Preview (via Google Generative AI API)
3. Note: Gemini does NOT have native 3D output. It generates Three.js code that constructs geometry. This is the recommended approach per Google's docs — no model currently outputs raw mesh data natively (only NVIDIA's LLaMA-Mesh can do that).

# Model
Anthropic Claude Opus 4.6
