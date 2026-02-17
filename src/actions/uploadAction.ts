// Client-side adapter for ImageKit upload
// "use server" is not supported in Vite, so we use a client-side wrapper.

import { uploadImage } from "../services/imagekit";

export async function uploadToolImage(formData: FormData) {
    try {
        const file = formData.get("file") as File;
        if (!file) {
            throw new Error("Tidak ada file yang diunggah.");
        }

        // Call the existing client-side service
        const url = await uploadImage(file);

        return { success: true, url };
    } catch (error: any) {
        console.error("ImageKit Upload Error:", error);
        return { success: false, error: error.message || "Gagal mengunggah foto." };
    }
}
