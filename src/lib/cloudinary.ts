interface CloudinaryCreds {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function getCloudinaryCreds(): CloudinaryCreds | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret };
  }

  // Suporte a CLOUDINARY_URL formato cloudinary://KEY:SECRET@CLOUD_NAME
  const url =
    process.env.CLOUDINARY_URL ?? process.env.CLOUDNARY_URL;
  if (url) {
    const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) {
      return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
    }
  }

  return null;
}
