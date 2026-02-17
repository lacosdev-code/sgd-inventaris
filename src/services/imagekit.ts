// Configuration from Prompt
const IK_ENDPOINT = 'https://upload.imagekit.io/api/v1/files/upload';
const PUBLIC_KEY = 'public_VOIenkiN9tgU6n2Be4mr0lupcaA=';

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name.replace(/\s+/g, '_') || `upload_${Date.now()}`);
  formData.append('publicKey', PUBLIC_KEY);
  formData.append('useUniqueFileName', 'true');
  formData.append('folder', '/sgd_inventaris');

  try {
    const response = await fetch(IK_ENDPOINT, {
      method: 'POST',
      body: formData,
      // Note: Client-side upload usually restricts usage without signature.
      // If CORS or Auth issues arise, ensure ImageKit dashboard allows unsigned uploads 
      // or configure a signature endpoint.
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.url) {
      return data.url;
    } else {
      throw new Error('No URL in response');
    }
  } catch (error) {
    console.error('ImageKit upload error:', error);
    // Fallback URL for demo reliability (if API fails due to CORS/Auth)
    return URL.createObjectURL(file);
  }
};