import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";

interface UploadResult {
  url: string;
  filename: string;
  path: string;
}

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const normalizeUrl = (value: string) => {
    if (/^(https?:|data:|blob:)/.test(value)) {
      return value;
    }

    return new URL(value, api.defaults.baseURL?.replace(/\/api\/?$/, "") ?? window.location.origin).toString();
  };

  const fileToDataUrl = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const uploadImage = async (file: File, propertyId?: number): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);

    const endpoints = [
      "/properties/upload-image/",
      "/property-images/upload/",
      "/upload-image/",
    ];

    try {
      for (const endpoint of endpoints) {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("file", file);
        if (propertyId) {
          formData.append("property_id", propertyId.toString());
          formData.append("property", propertyId.toString());
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
            url: normalizeUrl(rawUrl),
            filename: data.filename ?? file.name,
            path: data.path ?? rawUrl,
          };
        } catch (error) {
          const status = error && typeof error === "object" && "response" in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;

          if (status && ![404, 405].includes(status)) {
            throw error;
          }
        }
      }

      const dataUrl = await fileToDataUrl(file);
      toast.warning("No se encontró endpoint de subida. La imagen se añadió como vista local.");

      return {
        url: dataUrl,
        filename: file.name,
        path: file.name,
      };
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("No se pudo subir la imagen");
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return { uploadImage, uploading, progress };
}
