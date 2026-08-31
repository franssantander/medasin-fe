import type { Area } from "react-easy-crop";

const MAX_CROPPED_IMAGE_WIDTH = 1600;

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected image could not be loaded."));
    image.src = source;
  });
}

function croppedFileName(file: File) {
  const extension = file.name.lastIndexOf(".");
  const baseName = extension > 0 ? file.name.slice(0, extension) : file.name;
  const suffix = extension > 0 ? file.name.slice(extension) : "";

  return `${baseName}-cropped${suffix}`;
}

export async function cropImage(
  source: string,
  file: File,
  crop: Area,
) {
  const image = await loadImage(source);
  const scale = Math.min(1, MAX_CROPPED_IMAGE_WIDTH / crop.width);
  const width = Math.max(1, Math.round(crop.width * scale));
  const height = Math.max(1, Math.round(crop.height * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image cropping is not supported in this browser.");
  }

  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    width,
    height,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("The cropped image could not be created."));
      },
      file.type,
      0.9,
    );
  });

  return new File([blob], croppedFileName(file), {
    type: blob.type || file.type,
    lastModified: Date.now(),
  });
}
