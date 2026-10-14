import { v2 as cloudinary } from "cloudinary";
import { CLOUDINARY_PRODUCTS_FOLDER } from "./constants";
import { env } from "./env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

export interface UploadOptions {
  /** Target folder; defaults to `perfume-site/products/`. */
  folder?: string;
  /** Optional deterministic public id (without extension). */
  publicId?: string;
}

/**
 * Upload an image (a `File` from a multipart form, or a raw `Buffer`) to
 * Cloudinary and return its CDN URL + public id. Uses an upload stream so we
 * never buffer the whole file as a base64 string.
 */
export async function uploadImage(
  file: File | Buffer,
  options: UploadOptions = {},
): Promise<UploadedImage> {
  const buffer = Buffer.isBuffer(file)
    ? file
    : Buffer.from(await file.arrayBuffer());

  return new Promise<UploadedImage>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? CLOUDINARY_PRODUCTS_FOLDER,
        public_id: options.publicId,
        resource_type: "image",
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Încărcarea imaginii a eșuat"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      },
    );
    stream.end(buffer);
  });
}

/** Permanently delete an image from Cloudinary by its public id. */
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

export { cloudinary };
