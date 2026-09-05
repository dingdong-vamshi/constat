export async function preparePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG, or WebP image.");
  if (file.size > 25 * 1024 * 1024)
    throw new Error("Choose an image smaller than 25 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () =>
        reject(
          new Error(
            "This image could not be opened. Choose a different photo.",
          ),
        );
      i.src = url;
    });
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Image processing is unavailable in this browser.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let quality = 0.8;
    let data = canvas.toDataURL("image/jpeg", quality);
    while (data.length > 400000 && quality > 0.3) {
      quality -= 0.1;
      data = canvas.toDataURL("image/jpeg", quality);
    }
    if (data.length > 450000)
      throw new Error(
        "This photo is still too large after compression. Please crop it and try again.",
      );
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
