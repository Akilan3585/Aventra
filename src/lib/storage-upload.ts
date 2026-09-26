/**
 * Browser-side upload to a Supabase Storage signed upload URL. The file goes
 * straight from the browser to Storage, so it never passes through a Next.js
 * Server Action and is not subject to its request body limit. XMLHttpRequest
 * is used because `fetch` cannot report upload progress.
 */
export function uploadToSignedUrl(signedUrl: string, file: File, onProgress?: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", signedUrl);
    request.setRequestHeader("content-type", file.type || "application/octet-stream");
    request.setRequestHeader("x-upsert", "false");
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (publicKey) request.setRequestHeader("apikey", publicKey);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      let message = `Upload failed (${request.status}).`;
      try {
        const body = JSON.parse(request.responseText) as { error?: string; message?: string };
        if (body.message || body.error) message = `Upload failed: ${body.message ?? body.error}`;
      } catch {
        // Non-JSON error body; keep the status message.
      }
      reject(new Error(message));
    };
    request.onerror = () => reject(new Error("Upload failed: the network connection was interrupted."));
    request.onabort = () => reject(new Error("Upload cancelled."));
    request.send(file);
  });
}
