import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxWidthOrHeight: 1024,
    maxSizeMB: 0.5,
    useWebWorker: true,
  };
  
  try {
    const compressedFile = await imageCompression(file, options);
    // Return a new File object to maintain the original file name and type, since imageCompression might return a Blob or File without name
    return new File([compressedFile], file.name, {
      type: compressedFile.type || file.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Image compression failed:', error);
    // If compression fails, return original file
    return file;
  }
}
