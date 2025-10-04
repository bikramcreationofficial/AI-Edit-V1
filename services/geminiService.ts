import { GoogleGenAI, Modality } from "@google/genai";
import type { AspectRatio, ExpandDirection, ExpandSize } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

export const getBase64AndMimeType = (file: File): Promise<{ base64: string, mimeType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || file.type;
      resolve({ base64: data, mimeType });
    };
    reader.onerror = (error) => reject(error);
  });

const getImagePart = (base64Data: string, mimeType: string) => ({
  inlineData: { data: base64Data, mimeType },
});

export const removeBackground = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                getImagePart(base64Image, mimeType),
                { text: "Isolate the main product in this image and place it on a transparent background. The output must be a single PNG image with transparency. Do not add any shadows, reflections, or other elements." },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("No image was returned from the background removal process.");
  } catch (error) {
    console.error("Error removing background:", error);
    throw new Error("Failed to remove background from the image.");
  }
};

export const generatePoster = async (
  products: { base64: string; mimeType: string }[],
  concept: string,
  aspectRatio: AspectRatio,
  referenceImage: { base64: string; mimeType: string } | null,
  posterText: string,
): Promise<string> => {
    try {
        let textInstruction = "Do not add any text, words, or letters to the poster. The output should be purely visual.";
        if (posterText.trim()) {
            textInstruction = `Elegantly incorporate the following text into the design: "${posterText}".`;
        }
        
        const prompt = `Create an attractive, catchy poster based on the concept: "${concept}".
        The final image MUST be a high-resolution image targeting 2048x2048 pixels, and its dimensions MUST strictly conform to a ${aspectRatio} aspect ratio.
        Integrate the following product(s) seamlessly and naturally into the design. Ensure they are the focus.
        ${textInstruction}
        ${referenceImage ? "Use the provided reference image for style, mood, and composition inspiration." : ""}
        The final output should be a single, high-quality, complete poster image. Do not include any text placeholders like '[Your Text Here]'.`;

        const parts = [
            { text: prompt },
            ...products.map(p => getImagePart(p.base64, p.mimeType))
        ];
        if (referenceImage) {
            parts.push(getImagePart(referenceImage.base64, referenceImage.mimeType));
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("No poster was generated.");
    } catch (error) {
        console.error("Error generating poster:", error);
        throw new Error("Failed to generate the poster.");
    }
};

export const refinePoster = async (
    currentPoster: { base64: string; mimeType: string },
    refinementPrompt: string,
): Promise<string[]> => {
    try {
        const prompt = `Refine the provided poster image based on this instruction: "${refinementPrompt}".
        The output must be a new version of the image incorporating the change. Maintain the original aspect ratio.`;
        
        const parts = [
            { text: prompt },
            getImagePart(currentPoster.base64, currentPoster.mimeType)
        ];

        const generateVariation = async () => {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });
    
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    return part.inlineData.data;
                }
            }
            return null;
        }

        const [variation1, variation2] = await Promise.all([
            generateVariation(),
            generateVariation()
        ]);

        const results = [variation1, variation2].filter((v): v is string => v !== null);

        if (results.length === 0) {
            throw new Error("No refined poster was generated.");
        }
        
        return results;

    } catch (error) {
        console.error("Error refining poster:", error);
        throw new Error("Failed to refine the poster.");
    }
};

const performImageModification = async (
    poster: { base64: string; mimeType: string },
    prompt: string
): Promise<string> => {
    try {
        const parts = [
            { text: prompt },
            getImagePart(poster.base64, poster.mimeType)
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("No modified image was generated.");
    } catch (error) {
        console.error("Error during image modification:", error);
        throw error; // Re-throw to be caught by the caller
    }
};

export const upscalePoster = async (
    currentPoster: { base64: string; mimeType: string },
    scale: 2 | 4
): Promise<string> => {
    const prompt = `Upscale this image to ${scale}x its original resolution. Enhance details and quality while preserving the original style and content. The output must be a single, high-quality image.`;
    try {
        return await performImageModification(currentPoster, prompt);
    } catch (error) {
        throw new Error(`Failed to upscale the poster ${scale}x.`);
    }
};

export const expandPoster = async (
    currentPoster: { base64: string; mimeType: string },
    direction: ExpandDirection,
    size: ExpandSize
): Promise<string> => {
    let directionText = 'on all sides';
    switch (direction) {
        case 'top': directionText = 'on the top edge'; break;
        case 'bottom': directionText = 'on the bottom edge'; break;
        case 'left': directionText = 'on the left edge'; break;
        case 'right': directionText = 'on the right edge'; break;
    }

    const prompt = `Expand the canvas of this image by approximately ${size}% ${directionText}. Use generative fill (outpainting) to create new image data that seamlessly extends the existing scene, maintaining the original style and context. The output must be the expanded image.`;
     try {
        return await performImageModification(currentPoster, prompt);
    } catch (error) {
        throw new Error('Failed to expand the poster.');
    }
};