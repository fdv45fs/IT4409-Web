import { useMemo, useState } from "react";
import { X, Download } from "lucide-react";

function getExtension(nameOrUrl = "") {
  try {
    const clean = (nameOrUrl || "").split("?")[0].toLowerCase();
    const parts = clean.split(".");
    return parts.length > 1 ? parts.pop() : "";
  } catch {
    return "";
  }
}

export default function FilePreviewModal({ file, onClose }) {
  const [imageError, setImageError] = useState(false);

  const ext = useMemo(() => getExtension(file?.fileName || file?.fileUrl), [file]);
  const mime = file?.mimeType || "";
  const url = file?.fileUrl || "";
  const name = file?.fileName || "";

  const isImage = mime.startsWith("image/");
  const isPdf = mime.includes("pdf") || ext === "pdf";
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");
  const isText = mime.startsWith("text/") || ["txt", "md", "json", "xml", "csv"].includes(ext);
  const isOffice = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);

  const officeViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  const officeAltUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  const handleDownload = () => {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = name || "download";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="relative w-full max-w-[90vw] h-[90vh] mx-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 rounded-full bg-white/90 p-2 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <X className="h-5 w-5 text-gray-700" />
        </button>

        {/* Content */}
        <div className="overflow-auto custom-scrollbar h-full">
          {isImage ? (
            <div className="flex items-center justify-center h-full">
              {imageError ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500" onClick={(e) => e.stopPropagation()}>
                  <svg className="w-24 h-24 mb-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">Can not load image</p>
                  <p className="text-sm mb-6">The image may be corrupted or inaccessible.</p>
                  <button onClick={handleDownload} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Download</button>
                </div>
              ) : (
                <img src={url} alt={name} className="max-w-[95vw] max-h-[90vh] object-contain" onError={() => setImageError(true)} onClick={(e) => e.stopPropagation()} />
              )}
            </div>
          ) : isPdf ? (
            <div className="w-full h-full flex items-center justify-center">
              <iframe src={url} className="w-full h-full border-0" title={name} onClick={(e) => e.stopPropagation()} />
            </div>
          ) : isVideo ? (
            <div className="flex items-center justify-center h-full">
              <video src={url} controls className="max-w-[95vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>Your browser does not support video.</video>
            </div>
          ) : isAudio ? (
            <div className="flex flex-col items-center justify-center py-12">
              <audio src={url} controls className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>Your browser does not support audio.</audio>
            </div>
          ) : isText ? (
            <div className="w-full h-full flex items-center justify-center">
              <iframe src={url} className="w-full h-full border-0" title={name} onClick={(e) => e.stopPropagation()} />
            </div>
          ) : isOffice ? (
            <div className="w-full h-full flex flex-col" >
              <iframe src={officeViewerUrl} className="w-full h-full border-0" title={name} onClick={(e) => e.stopPropagation()} />
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg" onClick={(e) => e.stopPropagation()}>
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> If the preview is slow or fails to load, you can {""}
                  <button onClick={handleDownload} className="underline font-semibold hover:text-blue-900">download the file</button> or open it in {""}
                  <a href={officeAltUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-900">Microsoft Office Online</a>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-600">
              <p className="text-base">Preview is not available for this file.</p>
              <button onClick={handleDownload} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Download</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
