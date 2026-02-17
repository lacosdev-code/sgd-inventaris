// Configuration from Prompt
const IK_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT; // For display/transformation base if needed
const PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
const UPLOAD_API_URL = "https://upload.imagekit.io/api/v1/files/upload";

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name.replace(/\s+/g, '_') || `upload_${Date.now()}`);
  formData.append('publicKey', PUBLIC_KEY);
  formData.append('useUniqueFileName', 'true');
  formData.append('folder', '/sgd_inventaris');

  try {
    const response = await fetch(UPLOAD_API_URL, {
      method: 'POST',
      body: formData,
      // Note: Client-side upload usually restricts usage without signature.
      // If CORS or Auth issues arise, ensure ImageKit dashboard allows unsigned uploads 
      // or configure a signature endpoint.
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 403) {
        throw new Error(`Upload Failed: Forbidden (403). Please enable "Unsigned uploading" in your ImageKit Dashboard > Settings > Upload.`);
      }
      throw new Error(`Upload failed: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();

    if (data.url) {
      return data.url;
    } else {
      throw new Error('No URL in response');
    }
  } catch (error: any) {
    console.error('ImageKit upload error:', error);
    throw error;
  }
};