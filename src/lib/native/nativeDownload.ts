import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { LocalNotifications } from "@capacitor/local-notifications";
import { toast } from "sonner";

/**
 * Converts a Blob to a base64 string for Capacitor Filesystem API
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const result = reader.result as string;
      // Strip metadata prefix e.g. "data:application/pdf;base64,"
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Handles downloading and opening files natively on Android/iOS via Capacitor
 */
export async function downloadNativeFile(
  fileOrUrl: Blob | string,
  filename: string,
  _mimeType: string = "application/octet-stream"
): Promise<void> {
  // If running in browser (non-native), fallback to standard web download
  if (!Capacitor.isNativePlatform()) {
    if (typeof fileOrUrl === "string") {
      const link = document.createElement("a");
      link.href = fileOrUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const url = URL.createObjectURL(fileOrUrl);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    return;
  }

  try {
    toast.loading(`Saving ${filename}...`, { id: `download-${filename}` });

    let base64Data: string;
    if (fileOrUrl instanceof Blob) {
      base64Data = await blobToBase64(fileOrUrl);
    } else if (fileOrUrl.startsWith("data:")) {
      base64Data = fileOrUrl.split(",")[1];
    } else if (fileOrUrl.startsWith("blob:")) {
      const response = await fetch(fileOrUrl);
      const blob = await response.blob();
      base64Data = await blobToBase64(blob);
    } else {
      // Direct URL
      const response = await fetch(fileOrUrl);
      const blob = await response.blob();
      base64Data = await blobToBase64(blob);
    }

    // Save to device Documents directory
    const saved = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Documents,
      recursive: true,
    });

    toast.dismiss(`download-${filename}`);

    // Schedule native Android download complete notification
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 100000) + 1,
            title: "Download Complete",
            body: `${filename} downloaded successfully.`,
            channelId: "school_study_channel",
            extra: { uri: saved.uri },
          },
        ],
      });
    } catch {
      // Local notification optional fallback
    }

    // Offer quick action to open or share the file
    toast.success(`${filename} saved to Documents`, {
      action: {
        label: "Open / Share",
        onClick: async () => {
          try {
            await Share.share({
              title: filename,
              url: saved.uri,
            });
          } catch {
            // Share canceled or unavailable
          }
        },
      },
      duration: 6000,
    });
  } catch (error: any) {
    console.error("Native download error:", error);
    toast.dismiss(`download-${filename}`);
    toast.error(`Download failed: ${error?.message || "Unknown error"}`);
  }
}

/**
 * Attaches a global listener to intercept web <a> download clicks and route them
 * cleanly to native file storage and Android share/open intents.
 */
export function setupGlobalDownloadInterceptor(): () => void {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return () => {};
  }

  const handleDocumentClick = (event: MouseEvent) => {
    const target = (event.target as HTMLElement)?.closest("a");
    if (!target) return;

    const href = target.getAttribute("href") || "";
    const download = target.getAttribute("download");

    // Intercept client-side blob downloads or explicitly marked download links
    if (download !== null && (href.startsWith("blob:") || href.startsWith("data:"))) {
      event.preventDefault();
      event.stopPropagation();

      const filename = download || `download_${Date.now()}`;
      downloadNativeFile(href, filename);
    }
  };

  document.addEventListener("click", handleDocumentClick, true);

  return () => {
    document.removeEventListener("click", handleDocumentClick, true);
  };
}
