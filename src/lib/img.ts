import { SUPABASE_URL } from "./supabase";

/** A version of the image at a given width: resized by Unsplash or Supabase's image service. */
export function sized(url: string | null | undefined, w: number, q = 75): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname === "images.unsplash.com") {
      u.searchParams.set("w", String(w));
      u.searchParams.set("q", String(q));
      u.searchParams.set("auto", "format");
      if (!u.searchParams.has("fit")) u.searchParams.set("fit", "crop");
      return u.toString();
    }
    if (url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/`)) {
      return `${url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/")}?width=${w}&quality=${q}&resize=contain`;
    }
  } catch {
    /* relative or odd URL */
  }
  return url;
}

export const srcSet = (url: string | null | undefined, widths = [360, 540, 720, 960, 1280]) =>
  url ? widths.map((w) => `${sized(url, w)} ${w}w`).join(", ") : undefined;

export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

/** Downscale a photo in the browser before upload (phone photos are often 5–12 MB). Falls back to the original file. */
export async function shrinkImage(file: File, max = 2000, quality = 0.86): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1_500_000 && file.type !== "image/heic") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
