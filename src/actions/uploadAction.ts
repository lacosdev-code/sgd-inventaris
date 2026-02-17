// Client-side adapter for ImageKit upload
// "use server" is not supported in Vite, so we use a client-side wrapper.

import { uploadImage } from "../services/imagekit";

export async function uploadToolImage(formData: FormData) {
    try {
        const files = formData.getAll("files") as File[];

        // Fallback for single file input if "files" is empty but "file" exists
        if (files.length === 0) {
            const singleFile = formData.get("file") as File;
            if (singleFile) files.push(singleFile);
        }

        if (files.length === 0) {
            return { success: true, urls: [] }; // No files to upload
        }

        // Upload in parallel
        const uploadPromises = files.map(file => uploadImage(file));
        const urls = await Promise.all(uploadPromises);

        return { success: true, urls };
    } catch (error: any) {
        console.error("ImageKit Upload Error:", error);
        return { success: false, error: error.message || "Gagal mengunggah foto." };
    }
}
