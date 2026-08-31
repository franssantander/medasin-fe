const MAX_CROPPED_IMAGE_WIDTH = 1600;
const CROPPED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ImageCropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("The selected image could not be loaded."));
    image.src = source;
  });
}

function croppedImageType(file: File) {
  return CROPPED_IMAGE_TYPES.includes(
    file.type as (typeof CROPPED_IMAGE_TYPES)[number],
  )
    ? file.type
    : "image/png";
}

function croppedFileName(file: File, type: string) {
  const extension = file.name.lastIndexOf(".");
  const baseName = extension > 0 ? file.name.slice(0, extension) : file.name;

  return `${baseName || "image"}-cropped.${IMAGE_EXTENSIONS[type] || "png"}`;
}

function imageFileName(name: string | undefined, type: string) {
  const trimmedName = name?.trim();
  if (trimmedName && /\.[a-z0-9]+$/i.test(trimmedName)) return trimmedName;

  return `${trimmedName || "note-image"}.${IMAGE_EXTENSIONS[type] || "png"}`;
}

export async function imageUrlToFile(source: string, name?: string) {
  let response: Response;
  const fetchSource = imageFetchSource(source);

  try {
    response = await fetch(fetchSource);
  } catch {
    throw new Error(
      fetchSource.startsWith("/storage/")
        ? "The image could not be downloaded from note storage."
        : "The image could not be downloaded for cropping. External images must allow cross-origin access.",
    );
  }

  if (!response.ok) {
    throw new Error("The image could not be downloaded for cropping.");
  }

  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error("The selected block does not contain a supported image.");
  }

  return new File([blob], imageFileName(name, blob.type), {
    type: blob.type,
    lastModified: Date.now(),
  });
}

function imageFetchSource(source: string) {
  if (typeof window === "undefined") return source;

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source, window.location.origin);
  } catch {
    return source;
  }

  if (sourceUrl.protocol === "blob:" || sourceUrl.protocol === "data:") {
    return source;
  }

  if (
    (sourceUrl.protocol === "http:" || sourceUrl.protocol === "https:") &&
    sourceUrl.pathname.startsWith("/storage/")
  ) {
    return `${sourceUrl.pathname}${sourceUrl.search}`;
  }

  if (sourceUrl.origin === window.location.origin) {
    return `${sourceUrl.pathname}${sourceUrl.search}`;
  }

  return source;
}

export async function getImageAspectRatio(source: string) {
  const image = await loadImage(source);
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error("The selected image has invalid dimensions.");
  }

  return image.naturalWidth / image.naturalHeight;
}

export async function cropImage(
  source: string,
  file: File,
  crop: ImageCropArea,
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

  const type = croppedImageType(file);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("The cropped image could not be created."));
      },
      type,
      0.9,
    );
  });

  return new File([blob], croppedFileName(file, blob.type || type), {
    type: blob.type || type,
    lastModified: Date.now(),
  });
}
