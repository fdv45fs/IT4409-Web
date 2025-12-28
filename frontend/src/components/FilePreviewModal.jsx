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
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-5xl max-h-[90vh] rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Content */}
        <div className="p-4 overflow-auto custom-scrollbar max-h-[calc(90vh-56px)]">
          {isImage ? (
            <div className="flex items-center justify-center">
              {imageError ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <svg className="w-24 h-24 mb-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">Không thể tải ảnh</p>
                  <p className="text-sm mb-6">Ảnh có thể bị hỏng hoặc không truy cập được.</p>
                  <button onClick={handleDownload} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Tải xuống</button>
                </div>
              ) : (
                <img src={url} alt={name} className="max-w-full max-h-[70vh] object-contain" onError={() => setImageError(true)} />
              )}
            </div>
          ) : isPdf ? (
            <iframe src={url} className="w-full h-[70vh] border-0" title={name} />
          ) : isVideo ? (
            <div className="flex items-center justify-center">
              <video src={url} controls className="max-w-full max-h-[70vh]">Trình duyệt không hỗ trợ video.</video>
            </div>
          ) : isAudio ? (
            <div className="flex flex-col items-center justify-center py-12">
              <audio src={url} controls className="w-full max-w-md">Trình duyệt không hỗ trợ audio.</audio>
            </div>
          ) : isText ? (
            <iframe src={url} className="w-full h-[70vh] border border-gray-300 rounded" title={name} />
          ) : isOffice ? (
            <div className="w-full h-[70vh]">
              <iframe src={officeViewerUrl} className="w-full h-full border-0" title={name} />
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Mẹo:</strong> Nếu preview chậm hoặc không tải, bạn có thể {""}
                  <button onClick={handleDownload} className="underline font-semibold hover:text-blue-900">tải tệp</button> hoặc mở trong {""}
                  <a href={officeAltUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-900">Microsoft Office Online</a>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-600">
              <p className="text-base">Không hỗ trợ preview cho tệp này.</p>
              <button onClick={handleDownload} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Tải xuống</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
