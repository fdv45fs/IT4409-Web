import { useState, useRef } from "react";
import {
  X,
  Save,
  Loader2,
  Image,
  FileText,
  FileVideo,
  Download,
  Paperclip,
  Trash2,
} from "lucide-react";

function EditPostModal({
  post,
  channelId,
  authFetch,
  onClose,
  onSave,
  isLoading,
  onUploadFiles,
  onRemoveAttachment,
}) {
  const [content, setContent] = useState(post?.content || "");
  const [newFiles, setNewFiles] = useState([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  const fileInputRef = useRef(null);

  // Existing attachments (excluding removed ones)
  const existingAttachments = (post?.attachments || []).filter(
    (att) => !removedAttachmentIds.includes(att.id)
  );

  const isImage = (mimeType) => mimeType?.startsWith("image/");

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setNewFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingAttachment = (attachmentId) => {
    setRemovedAttachmentIds((prev) => [...prev, attachmentId]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && existingAttachments.length === 0 && newFiles.length === 0) {
      return;
    }

    // 1. Xóa các attachments đã đánh dấu remove
    if (removedAttachmentIds.length > 0 && onRemoveAttachment) {
      for (const attachmentId of removedAttachmentIds) {
        try {
          await onRemoveAttachment(attachmentId);
        } catch (err) {
          console.error("Failed to remove attachment:", err);
        }
      }
    }

    // 2. Upload new files nếu có
    if (newFiles.length > 0 && onUploadFiles) {
      setIsUploadingFiles(true);
      try {
        await onUploadFiles(newFiles);
      } catch (err) {
        console.error("Failed to upload files:", err);
      } finally {
        setIsUploadingFiles(false);
      }
    }

    // 3. Save content
    onSave({ content: content.trim() });
  };

  const isBusy = isLoading || isUploadingFiles;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">
            Edit Post
          </h2>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Post Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Input your post content here..."
                rows={5}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">
                {content.length} characters
              </p>
            </div>

            {/* Existing Attachments */}
            {existingAttachments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Images/Files
                </label>
                <div className="space-y-2">
                  {/* Images */}
                  {existingAttachments.filter((a) => isImage(a.mimeType)).length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {existingAttachments
                        .filter((a) => isImage(a.mimeType))
                        .map((att) => (
                          <div
                            key={att.id}
                            className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100"
                          >
                            <img
                              src={att.fileUrl}
                              alt={att.fileName}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingAttachment(att.id)}
                              className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              title="Delete image"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Files */}
                  {existingAttachments.filter((a) => !isImage(a.mimeType)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {existingAttachments
                        .filter((a) => !isImage(a.mimeType))
                        .map((att) => (
                          <div
                            key={att.id}
                            className="group flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                          >
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700 max-w-[120px] truncate">
                              {att.fileName}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingAttachment(att.id)}
                              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                              title="Delete file"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* New Files to Upload */}
            {newFiles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Images/Files to add
                </label>
                <div className="flex flex-wrap gap-2">
                  {newFiles.map((file, index) => {
                    const isImg = file.type.startsWith("image/");
                    const isVid = file.type.startsWith("video/");
                    return (
                      <div
                        key={index}
                        className="relative group flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2"
                      >
                        {isImg ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : isVid ? (
                          <FileVideo className="h-6 w-6 text-indigo-500" />
                        ) : (
                          <FileText className="h-6 w-6 text-indigo-500" />
                        )}
                        <span className="text-xs text-indigo-700 max-w-[100px] truncate">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewFile(index)}
                          className="p-0.5 rounded-full text-indigo-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add Files Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors disabled:opacity-50"
              >
                <Paperclip className="h-4 w-4" />
                Add image/file
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy || (!content.trim() && existingAttachments.length === 0 && newFiles.length === 0)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isUploadingFiles ? "Uploading files..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditPostModal;
