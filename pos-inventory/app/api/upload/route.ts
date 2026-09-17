import { NextRequest } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

function uploadToCloudinary(buffer: Buffer, folder: string) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );

    upload.end(buffer);
  });
}

export async function POST(request: NextRequest) {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return Response.json(
        { error: "Cloudinary is not configured on the server" },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "An image file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "Only image files are supported" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: "Images must be 5 MB or smaller" }, { status: 400 });
    }

    const result = await uploadToCloudinary(
      Buffer.from(await file.arrayBuffer()),
      "pos-inventory/products"
    );

    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Image upload failed" }, { status: 500 });
  }
}
