import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth";

function ChannelFiles({ channelId, isChannelAdmin }) {
  const { authFetch, authFetchRaw, currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: "Files" }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renamingItem, setRenamingItem] = useState(null);
  const [newName, setNewName] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, [channelId, currentFolder]);

  // Đóng menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('.relative')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  // Đóng preview khi nhấn ESC
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && previewFile) {
        closePreview();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [previewFile]);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const endpoint = currentFolder
        ? `/api/channels/${channelId}/materials/folders/${currentFolder}`
        : `/api/channels/${channelId}/materials`;
      const data = await authFetch(endpoint);

      if (currentFolder && data.folder) {
        // Inside a folder - API returns { folder, subfolders, files }
        const allItems = [
          ...(data.subfolders || []).map(f => ({ ...f, type: 'folder' })),
          ...(data.files || []).map(f => ({ ...f, type: 'file' }))
        ];
        setItems(allItems);
      } else {
        // Root level - API returns array of items
        setItems(Array.isArray(data) ? data.map(item => ({
          ...item,
          type: item.fileUrl ? 'file' : 'folder'
        })) : []);
      }
    } catch (err) {
      console.error("Failed to fetch materials:", err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (files.length > 20) {
      alert("You can only upload up to 20 files at a time");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const endpoint = currentFolder
        ? `/api/channels/${channelId}/materials/folders/${currentFolder}/files`
        : `/api/channels/${channelId}/materials/files`;

      await authFetch(endpoint, {
        method: "POST",
        body: formData,
      });

      document.getElementById("file-input").value = "";
      await fetchMaterials();
    } catch (err) {
      alert(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert("Please enter a folder name");
      return;
    }

    try {
      const endpoint = currentFolder
        ? `/api/channels/${channelId}/materials/folders/${currentFolder}`
        : `/api/channels/${channelId}/materials`;

      await authFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ name: newFolderName }),
      });

      setNewFolderName("");
      setShowCreateFolder(false);
      await fetchMaterials();
    } catch (err) {
      alert(err.message || "Failed to create folder");
    }
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"?`)) {
      return;
    }

    try {
      await authFetch(`/api/channels/${channelId}/materials/files/${fileId}`, {
        method: "DELETE",
      });
      await fetchMaterials();
    } catch (err) {
      alert(err.message || "Failed to delete file");
    }
  };

  const handleDeleteFolder = async (folderId, folderName) => {
    if (!window.confirm(`Delete folder "${folderName}" and all its contents?`)) {
      return;
    }

    try {
      await authFetch(`/api/channels/${channelId}/materials/folders/${folderId}`, {
        method: "DELETE",
      });
      await fetchMaterials();
    } catch (err) {
      alert(err.message || "Failed to delete folder");
    }
  };

  const handleRename = async (item) => {
    if (!newName.trim()) {
      alert("Please enter a name");
      return;
    }

    try {
      const endpoint = item.type === 'folder'
        ? `/api/channels/${channelId}/materials/folders/${item.id}/rename`
        : `/api/channels/${channelId}/materials/files/${item.id}/rename`;

      await authFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ name: newName }),
      });

      setRenamingItem(null);
      setNewName("");
      await fetchMaterials();
    } catch (err) {
      alert(err.message || "Failed to rename");
    }
  };

  const startRename = (item) => {
    setRenamingItem(item);
    setNewName(item.name || item.fileName);
    setOpenMenuId(null);
  };

  const cancelRename = () => {
    setRenamingItem(null);
    setNewName("");
  };

  const handleDownload = async (item) => {
    try {
      // Prefer server-streamed download to preserve auth/CORS
      const downloadPath = `/upload/channels/${channelId}/materials/files/${item.id}/download`;
      const response = await authFetchRaw(downloadPath);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setOpenMenuId(null);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: mở trong tab mới
      window.open(item.fileUrl, '_blank');
      setOpenMenuId(null);
    }
  };

  const handlePreview = (item) => {
    // Check if file can be previewed in modal
    const canPreviewInModal =
      item.mimeType?.startsWith('image/') ||
      item.mimeType?.includes('pdf') ||
      item.mimeType?.startsWith('video/') ||
      item.mimeType?.startsWith('audio/') ||
      item.mimeType?.startsWith('text/') ||
      ['txt', 'md', 'json', 'xml', 'csv'].includes(item.extension);

    // Office files - preview trong modal với Google Docs Viewer (nhanh hơn)
    const isOfficeFile = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(item.extension);

    if (canPreviewInModal || isOfficeFile) {
      setPreviewFile(item);
    } else {
      // Download directly for unsupported types
      handleDownload(item);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setImageError(false);
  };

  const openFolder = (folder) => {
    setCurrentFolder(folder.id);
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
  };

  const navigateToBreadcrumb = (index) => {
    const crumb = breadcrumbs[index];
    setCurrentFolder(crumb.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const formatFileSize = (bytes) => {
    if (bytes === null || bytes === undefined) return "-";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });
  };

  const getFileIcon = (item) => {
    if (item.type === 'folder') {
      return (
        <svg className="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      );
    }

    const mimeType = item.mimeType || "";

    if (mimeType.startsWith("image/")) {
      return (
        <svg className="w-10 h-10 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    }

    if (mimeType.includes("pdf")) {
      return (
        <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }

    if (mimeType.includes("word") || mimeType.includes("document")) {
      return (
        <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    }

    if (mimeType.includes("sheet") || mimeType.includes("excel")) {
      return (
        <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }

    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
      return (
        <svg className="w-10 h-10 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }

    if (mimeType.startsWith("video/")) {
      return (
        <svg className="w-10 h-10 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      );
    }

    return (
      <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id || 'root'} className="flex items-center">
                {index > 0 && (
                  <svg className="w-4 h-4 mx-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>

          {/* Action buttons - Tất cả member đều có thể upload và tạo folder */}
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                id="file-input"
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {isUploading ? "Uploading..." : "Upload"}
              </div>
            </label>

            <button
              onClick={() => setShowCreateFolder(!showCreateFolder)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              New folder
            </button>
          </div>
        </div>

        {/* Create folder input */}
        {showCreateFolder && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') {
                  setShowCreateFolder(false);
                  setNewFolderName("");
                }
              }}
              autoFocus
            />
            <button
              onClick={handleCreateFolder}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateFolder(false);
                setNewFolderName("");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-sm font-medium">This folder is empty</p>
            <p className="text-xs mt-1">Upload files or create folders to get started</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modified
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modified by
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File size
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => {
                const isRenaming = renamingItem?.id === item.id;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      if (isRenaming) return;
                      if (item.type === 'folder') {
                        openFolder(item);
                      } else {
                        handlePreview(item);
                      }
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {getFileIcon(item)}
                        </div>
                        <div className="ml-4">
                          {isRenaming ? (
                            <input
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(item);
                                if (e.key === 'Escape') cancelRename();
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : (
                            <div className="text-sm font-medium text-gray-900">
                              {item.name || item.fileName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.updatedAt || item.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.uploader?.fullName || item.creator?.fullName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.type === 'file' ? formatFileSize(item.fileSize) : formatFileSize(item.totalSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isRenaming ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRename(item);
                            }}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelRename();
                            }}
                            className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === item.id ? null : item.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>

                          {openMenuId === item.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                              <div className="py-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startRename(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Rename
                                </button>

                                {item.type === 'file' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(item);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download
                                  </button>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    if (item.type === 'folder') {
                                      handleDeleteFolder(item.id, item.name);
                                    } else {
                                      handleDeleteFile(item.id, item.fileName || item.name);
                                    }
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={closePreview}
        >
          <div
            className="relative max-w-7xl max-h-[90vh] w-full mx-4 bg-white rounded-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {getFileIcon(previewFile)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {previewFile.fileName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(previewFile.fileSize)} • Uploaded by {previewFile.uploader?.fullName || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg"
                  title="Download"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={closePreview}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="p-6 overflow-auto max-h-[calc(90vh-100px)]">
              {previewFile.mimeType?.startsWith('image/') ? (
                // Image Preview
                <div className="flex items-center justify-center">
                  {imageError ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                      <svg className="w-24 h-24 mb-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-lg font-medium mb-2">Failed to load image</p>
                      <p className="text-sm mb-6">The image could not be loaded. It may be corrupted or inaccessible.</p>
                      <button
                        onClick={() => handleDownload(previewFile)}
                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Download File
                      </button>
                    </div>
                  ) : (
                    <img
                      src={previewFile.fileUrl}
                      alt={previewFile.fileName}
                      className="max-w-full max-h-[70vh] object-contain"
                      onError={() => setImageError(true)}
                    />
                  )}
                </div>
              ) : previewFile.mimeType?.includes('pdf') ? (
                // PDF Preview
                <iframe
                  src={previewFile.fileUrl}
                  className="w-full h-[70vh] border-0"
                  title={previewFile.fileName}
                />
              ) : previewFile.mimeType?.startsWith('video/') ? (
                // Video Preview
                <div className="flex items-center justify-center">
                  <video
                    src={previewFile.fileUrl}
                    controls
                    className="max-w-full max-h-[70vh]"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : previewFile.mimeType?.startsWith('audio/') ? (
                // Audio Preview
                <div className="flex flex-col items-center justify-center py-12">
                  <svg className="w-24 h-24 text-gray-400 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <audio
                    src={previewFile.fileUrl}
                    controls
                    className="w-full max-w-md"
                  >
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              ) : previewFile.mimeType?.startsWith('text/') ||
                 previewFile.extension === 'txt' ||
                 previewFile.extension === 'md' ||
                 previewFile.extension === 'json' ||
                 previewFile.extension === 'xml' ||
                 previewFile.extension === 'csv' ? (
                // Text File Preview
                <iframe
                  src={previewFile.fileUrl}
                  className="w-full h-[70vh] border border-gray-300 rounded"
                  title={previewFile.fileName}
                />
              ) : ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(previewFile.extension) ? (
                // Office Files Preview using Google Docs Viewer
                <div className="w-full h-[70vh]">
                  <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewFile.fileUrl)}&embedded=true`}
                    className="w-full h-full border-0"
                    title={previewFile.fileName}
                  />
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Tip:</strong> If the preview is slow or doesn't load, you can{' '}
                      <button
                        onClick={() => handleDownload(previewFile)}
                        className="underline font-semibold hover:text-blue-900"
                      >
                        download the file
                      </button>{' '}
                      or open it in{' '}
                      <a
                        href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewFile.fileUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold hover:text-blue-900"
                      >
                        Microsoft Office Online
                      </a>
                    </p>
                  </div>
                </div>
              ) : (
                // Fallback for unsupported file types
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <svg className="w-24 h-24 mb-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">Preview not available</p>
                  <p className="text-sm mb-6">This file type cannot be previewed in the browser</p>
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChannelFiles;
