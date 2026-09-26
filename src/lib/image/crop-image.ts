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

export type CropImageOptions = {
  maxBytes?: number;
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

export function imageFetchSource(source: string) {
  const baseUrl =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source, baseUrl);
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

  if (typeof window !== "undefined" && sourceUrl.origin === window.location.origin) {
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
  options: CropImageOptions = {},
) {
  const image = await loadImage(source);
  const scale = Math.min(1, MAX_CROPPED_IMAGE_WIDTH / crop.width);
  let width = Math.max(1, Math.round(crop.width * scale));
  let height = Math.max(1, Math.round(crop.height * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image cropping is not supported in this browser.");
  }

  const draw = () => {
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
  };

  const encode = (type: string, quality: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("The cropped image could not be created."));
        },
        type,
        quality,
      );
    });

  draw();

  const type = croppedImageType(file);
  let blob = await encode(type, 0.9);

  if (options.maxBytes && blob.size > options.maxBytes) {
    // A valid source can grow beyond the upload limit when converted to PNG.
    // WebP preserves transparency, so prefer it before reducing dimensions.
    const originalWidth = width;
    const originalHeight = height;
    for (let attempt = 0; attempt < 9; attempt += 1) {
      if (attempt > 0) {
        const nextScale = 0.8 ** attempt;
        width = Math.max(1, Math.round(originalWidth * nextScale));
        height = Math.max(1, Math.round(originalHeight * nextScale));
        draw();
      }

      for (const quality of [0.85, 0.7, 0.55]) {
        const candidate = await encode("image/webp", quality);
        if (candidate.type !== "image/webp") break;
        if (candidate.size <= options.maxBytes) {
          blob = candidate;
          break;
        }
      }
      if (blob.size <= options.maxBytes) break;

      // Browsers without WebP encoding can still submit a smaller PNG/JPEG.
      const fallback = await encode(type, 0.9);
      if (fallback.size <= options.maxBytes) {
        blob = fallback;
        break;
      }
    }

    if (blob.size > options.maxBytes) {
      throw new Error("The cropped image is too large. Choose a smaller crop or image.");
    }
  }

  return {
    file: new File([blob], croppedFileName(file, blob.type || type), {
      type: blob.type || type,
      lastModified: Date.now(),
    }),
    width,
    height,
  };
}
