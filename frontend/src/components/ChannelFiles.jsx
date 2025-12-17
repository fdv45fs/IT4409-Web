import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth";

function ChannelFiles({ channelId, isChannelAdmin }) {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: "Files" }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    fetchMaterials();
  }, [channelId, currentFolder]);

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

          {/* Action buttons */}
          {isChannelAdmin && (
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
          )}
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
            {isChannelAdmin && (
              <p className="text-xs mt-1">Upload files or create folders to get started</p>
            )}
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
                {isChannelAdmin && (
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => item.type === 'folder' ? openFolder(item) : null}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {getFileIcon(item)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.name || item.fileName}
                        </div>
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
                  {isChannelAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {item.type === 'file' && (
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.type === 'folder') {
                              handleDeleteFolder(item.id, item.name);
                            } else {
                              handleDeleteFile(item.id, item.fileName || item.name);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default ChannelFiles;
