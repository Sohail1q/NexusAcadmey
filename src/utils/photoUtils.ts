/**
 * Centralized utility for handling online photo URLs and uploads
 */

export const getFullPhotoUrl = (photoPath?: string): string => {
  if (!photoPath || typeof photoPath !== 'string') return '';
  const trimmed = photoPath.trim();
  if (
    !trimmed ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === 'data:,'
  ) {
    return '';
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // If already an absolute HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If it points to localhost:3000 but the app is accessed on a domain/cloud preview, adapt it
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      if (trimmed.includes('localhost:3000') || trimmed.includes('127.0.0.1:3000')) {
        return trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1):3000/, origin);
      }
    }
    return trimmed;
  }

  // If it's a data URL (base64 image), return it as-is for <img> rendering
  // (Do NOT prepend origin/ to base64, which would break the link)
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // If it's a relative path like /uploads/student_123.jpg
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return origin ? `${origin}${cleanPath}` : cleanPath;
};

/**
 * Checks if a given photo string is a real web-accessible online URL (not base64)
 */
export const isDirectOnlineLink = (photoPath?: string): boolean => {
  if (!photoPath) return false;
  const trimmed = photoPath.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/uploads/')
  );
};

/**
 * Uploads a base64 or File image to the server to obtain a permanent online /uploads/ URL link
 */
export async function uploadImageToServer(
  dataUrl: string,
  studentId?: string,
  name?: string
): Promise<string> {
  if (!dataUrl) return '';

  // If already a server upload link, return as is
  if (dataUrl.startsWith('/uploads/') || dataUrl.startsWith('http')) {
    return dataUrl;
  }

  try {
    const res = await fetch('/api/images/base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataUrl,
        studentId: studentId || 'student',
        name: name || 'photo',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('Could not upload image to server, falling back to data URL:', err);
  }

  return dataUrl;
}
