import { useState } from "react";
import { toast } from "sonner";
import api, { resolveMediaUrl } from "@/lib/api";

interface UploadResult {
  url: string;
  filename: string;
  path: string;
}

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (
    file: File,
    options?: { propertyId?: number; bookingId?: number; kind?: "image" | "resource" | "contract" },
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);

    const kind = options?.kind ?? "resource";
    const endpoints = kind === "image"
      ? ["/properties/upload-image/", "/property-images/upload/", "/upload-image/"]
      : ["/uploads/", "/files/upload/", "/upload-file/"];

    try {
      for (const endpoint of endpoints) {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("file", file);
        formData.append("kind", kind);
        if (options?.propertyId) {
          formData.append("property_id", options.propertyId.toString());
          formData.append("property", options.propertyId.toString());
        }
        if (options?.bookingId) {
          formData.append("booking_id", options.bookingId.toString());
          formData.append("booking", options.bookingId.toString());
        }

        try {
          const { data } = await api.post<Record<string, string>>(endpoint, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setProgress(percent);
              }
            },
          });

          const rawUrl = data.url ?? data.image_url ?? data.path ?? data.file;
          if (!rawUrl) {
            throw new Error("La respuesta del servidor no incluye la URL de la imagen");
          }

          return {
            url: resolveMediaUrl(rawUrl),
            filename: data.filename ?? file.name,
            path: data.path ?? rawUrl,
          };
        } catch (error) {
          const status = error && typeof error === "object" && "response" in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;

          if (status && ![400, 404, 405, 413, 415].includes(status)) {
            throw error;
          }
        }
      }

      toast.error("No se encontró un endpoint válido para subir el archivo.");
      return null;
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("No se pudo subir el archivo");
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const uploadImage = async (file: File, propertyId?: number): Promise<UploadResult | null> =>
    uploadFile(file, { propertyId, kind: "image" });

  return { uploadImage, uploadFile, uploading, progress };
}
