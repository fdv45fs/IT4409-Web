import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Send,
  Smile,
  MoreHorizontal,
  Edit2,
  Trash2,
  Check,
  XCircle,
  MessageCircle,
  Clock,
  FileText,
  Download,
  Paperclip,
  Loader2,
  Image,
  FileAudio,
  FileArchive,
  FileVideo,
} from "lucide-react";
import {
  getPostDetail,
  getPostComments,
  addPostComment,
  updatePostComment,
  deletePostComment,
  togglePostReaction,
  toggleCommentReaction,
  uploadCommentFiles,
} from "../api";
import LinkPreviews from "./LinkPreview";
import FilePreviewModal from "./FilePreviewModal";
import ConfirmationModal from "./ConfirmationModal";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👏"];

// List of known non-image extensions
const NON_IMAGE_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', 'mp3', 'mp4', 'avi', 'mov'];

// Component to preview attachment - tries to render as image first, falls back to file link
function AttachmentPreview({ attachment, onPreview }) {
  const [isImage, setIsImage] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Check if URL is definitely NOT an image (known file extensions)
  const isDefinitelyNotImage = () => {
    const url = attachment.fileUrl?.toLowerCase() || "";
    const fileName = attachment.fileName?.toLowerCase() || "";

    // Check mimeType first
    if (attachment.mimeType && !attachment.mimeType.startsWith("image/")) {
      // Only return true if mimeType is a known non-image type
      const knownNonImage = ['application/pdf', 'application/msword', 'application/vnd', 'text/', 'audio/', 'video/'];
      if (knownNonImage.some(t => attachment.mimeType.includes(t))) {
        return true;
      }
    }

    // Check extension
    for (const ext of NON_IMAGE_EXTENSIONS) {
      if (url.endsWith(`.${ext}`) || fileName.endsWith(`.${ext}`)) {
        return true;
      }
    }
    return false;
  };

  // Initially try as image unless it's definitely not an image
  useEffect(() => {
    setIsImage(!isDefinitelyNotImage());
  }, [attachment.fileUrl, attachment.mimeType]);

  if (isImage) {
    return (
      <button
        type="button"
        onClick={() => (onPreview ? onPreview(attachment) : window.open(attachment.fileUrl, "_blank"))}
        className="relative rounded-lg overflow-hidden bg-gray-100 w-24 h-24 flex items-center justify-center group"
        title={attachment.fileName}
      >
        <img
          src={attachment.fileUrl}
          alt={attachment.fileName}
          className={`w-full h-full object-cover ${loaded ? '' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setIsImage(false)}
        />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 border border-gray-300 rounded-lg pointer-events-none" />
      </button>
    );
  }

  // Non-image file card with type badge
  const ext = (attachment.fileName || attachment.fileUrl || "").split("?")[0].split(".").pop()?.toLowerCase() || "";
  const typeInfo = (() => {
    if (ext === "pdf") return { icon: FileText, color: "text-red-600", bg: "bg-red-50", label: "PDF" };
    if (["doc", "docx"].includes(ext)) return { icon: FileText, color: "text-blue-600", bg: "bg-blue-50", label: ext.toUpperCase() };
    if (["xls", "xlsx"].includes(ext)) return { icon: FileText, color: "text-green-600", bg: "bg-green-50", label: ext.toUpperCase() };
    if (["ppt", "pptx"].includes(ext)) return { icon: FileText, color: "text-orange-600", bg: "bg-orange-50", label: ext.toUpperCase() };
    if (["zip", "rar"].includes(ext)) return { icon: FileArchive, color: "text-purple-600", bg: "bg-purple-50", label: ext.toUpperCase() };
    if (["mp3", "wav", "m4a"].includes(ext)) return { icon: FileAudio, color: "text-indigo-600", bg: "bg-indigo-50", label: ext.toUpperCase() };
    if (["mp4", "mov", "avi", "mkv"].includes(ext)) return { icon: FileVideo, color: "text-teal-600", bg: "bg-teal-50", label: ext.toUpperCase() };
    return { icon: FileText, color: "text-gray-600", bg: "bg-gray-50", label: ext ? ext.toUpperCase() : "FILE" };
  })();

  const Icon = typeInfo.icon;

  return (
    <button
      type="button"
      onClick={() => (onPreview ? onPreview(attachment) : window.open(attachment.fileUrl, "_blank"))}
      className="w-[160px] h-[110px] rounded-lg bg-gray-100 px-3 py-2 flex flex-col items-center justify-center hover:bg-gray-200 transition-colors"
      title={attachment.fileName}
    >
      <div className={`flex items-center gap-1 ${typeInfo.bg} px-2 py-1 rounded-full mb-2`}>
        <Icon className={`h-4 w-4 ${typeInfo.color}`} />
        <span className={`text-[11px] font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
      </div>
      <span className="text-[12px] text-gray-700 max-w-[140px] truncate text-center">{attachment.fileName}</span>
    </button>
  );
}

function PostDetailModal({
  channelId,
  postId,
  currentUser,
  authFetch,
  onClose,
  onPostUpdated,
  onPostDeleted,
}) {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentReactions, setCommentReactions] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [isUploadingComment, setIsUploadingComment] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  const [newComment, setNewComment] = useState("");
  const [commentFiles, setCommentFiles] = useState([]);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [deleteCommentConfirm, setDeleteCommentConfirm] = useState({
    isOpen: false,
    commentId: null,
  });
  const [activeCommentMenu, setActiveCommentMenu] = useState(null);
  const [showCommentReactionPicker, setShowCommentReactionPicker] =
    useState(null);

  const commentInputRef = useRef(null);
  const commentFileInputRef = useRef(null);


  // Fetch post detail
  const fetchPost = useCallback(async () => {
    try {
      const data = await getPostDetail(channelId, postId, authFetch);
      setPost(data);
    } catch (err) {
      console.error("Failed to fetch post:", err);
    }
  }, [channelId, postId, authFetch]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    setIsCommentsLoading(true);
    try {
      const data = await getPostComments(channelId, postId, authFetch);
      const commentsArray = Array.isArray(data) ? data : [];
      setComments(commentsArray);

      const reactionsMap = {};
      commentsArray.forEach((comment) => {
        if (comment.reactions) {
          reactionsMap[comment.id] = comment.reactions;
        }
      });
      setCommentReactions(reactionsMap);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setIsCommentsLoading(false);
    }
  }, [channelId, postId, authFetch]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchPost(), fetchComments()]).finally(() =>
      setIsLoading(false)
    );
  }, [fetchPost, fetchComments]);

  // Handle add comment with optional files
  const handleAddComment = async (e) => {
    e.preventDefault();
    if ((!newComment.trim() && commentFiles.length === 0) || isSendingComment) return;

    setIsSendingComment(true);
    try {
      // Create comment first
      const createdComment = await addPostComment(channelId, postId, newComment.trim() || " ", authFetch);

      // Upload files if any
      if (commentFiles.length > 0 && createdComment?.id) {
        setIsUploadingComment(true);
        await uploadCommentFiles(channelId, postId, createdComment.id, commentFiles, authFetch);
      }

      setNewComment("");
      setCommentFiles([]);
      if (commentFileInputRef.current) {
        commentFileInputRef.current.value = "";
      }
      fetchComments();
      fetchPost();
      onPostUpdated?.();
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setIsSendingComment(false);
      setIsUploadingComment(false);
    }
  };

  // Handle comment file select
  const handleCommentFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setCommentFiles((prev) => [...prev, ...files]);
    }
  };

  // Handle remove selected comment file
  const handleRemoveCommentFile = (index) => {
    setCommentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle edit comment
  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
    setActiveCommentMenu(null);
  };

  const handleSaveEditComment = async (commentId) => {
    if (!editingCommentContent.trim()) return;

    try {
      await updatePostComment(
        channelId,
        postId,
        commentId,
        editingCommentContent.trim(),
        authFetch
      );
      setEditingCommentId(null);
      setEditingCommentContent("");
      fetchComments();
    } catch (err) {
      console.error("Failed to update comment:", err);
    }
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId) => {
    setDeleteCommentConfirm({ isOpen: true, commentId });
  };

  const confirmDeleteComment = async () => {
    if (!deleteCommentConfirm.commentId) return;

    try {
      await deletePostComment(channelId, postId, deleteCommentConfirm.commentId, authFetch);
      fetchComments();
      fetchPost();
      onPostUpdated?.();
      setDeleteCommentConfirm({ isOpen: false, commentId: null });
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  // Handle post reaction - sử dụng toggle
  const handlePostReaction = async (emoji) => {
    if (isReacting) return;

    setIsReacting(true);
    try {
      const result = await togglePostReaction(
        channelId,
        postId,
        emoji,
        authFetch
      );
      // Update reactions from response
      setPost((prev) =>
        prev ? { ...prev, reactions: result.reactions } : prev
      );
      onPostUpdated?.();
    } catch (err) {
      console.error("Failed to react:", err);
    } finally {
      setIsReacting(false);
      setShowReactionPicker(false);
    }
  };

  // Handle comment reaction - sử dụng toggle
  const handleCommentReaction = async (commentId, emoji) => {
    try {
      const result = await toggleCommentReaction(
        channelId,
        postId,
        commentId,
        emoji,
        authFetch
      );
      // Update reactions from response
      setCommentReactions((prev) => ({
        ...prev,
        [commentId]: result.reactions || [],
      }));
    } catch (err) {
      console.error("Failed to react to comment:", err);
    } finally {
      setShowCommentReactionPicker(null);
    }
  };



  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isImage = (mimeType) => mimeType?.startsWith("image/");
  const isVideo = (mimeType) => mimeType?.startsWith("video/");
  const isPostAuthor = post?.author?.id === currentUser?.id;
  const reactions = post?.reactions || [];
  const attachments = post?.attachments || [];
  const imageAttachments = attachments.filter((a) => isImage(a.mimeType));
  const videoAttachments = attachments.filter((a) => isVideo(a.mimeType));
  const otherAttachments = attachments.filter(
    (a) => !isImage(a.mimeType) && !isVideo(a.mimeType)
  );

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-8 shadow-xl">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
          <p className="text-red-600">Failed to load post</p>
          <button
            onClick={onClose}
            className="mt-4 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-2xl h-[85vh] overflow-y-auto custom-scrollbar rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-gray-100 bg-white/95 backdrop-blur px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Post Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Post content */}
        <div className="p-6">
          {/* Author */}
          <div className="flex items-start gap-3">
            {post.author?.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt={post.author.fullName || post.author.username}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-50"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white uppercase shadow-inner">
                {post.author?.fullName
                  ? post.author.fullName.slice(0, 2)
                  : post.author?.username?.slice(0, 2) || "??"}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">
                  {post.author?.fullName || post.author?.username || "Anonymous"}
                </h3>
                {isPostAuthor && (
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                    You
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formatDate(post.createdAt)}</span>
                {post.updatedAt && post.updatedAt !== post.createdAt && (
                  <span className="text-gray-400">(edited)</span>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mt-4">
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>

            {/* Link Previews */}
            <LinkPreviews text={post.content} authFetch={authFetch} maxPreviews={2} />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-4 space-y-3">
              {/* Videos */}
              {videoAttachments.length > 0 && (
                <div className="space-y-3">
                  {videoAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="relative aspect-video rounded-xl overflow-hidden bg-black/80"
                    >
                      <video
                        src={att.fileUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewFile(att)}
                        className="absolute top-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-black/80"
                      >
                        Expand
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Images */}
              {imageAttachments.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {imageAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="relative group aspect-video rounded-lg overflow-hidden bg-gray-100"
                    >
                      <img
                        src={att.fileUrl}
                        alt={att.fileName}
                        className="w-full h-full object-cover cursor-zoom-in hover:opacity-90"
                        onClick={() => setPreviewFile(att)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Other files */}
              {otherAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {otherAttachments.map((att) => (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => setPreviewFile(att)}
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700 max-w-[150px] truncate">
                        {att.fileName}
                      </span>
                      <Download className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}



          {/* Reactions */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {/* Existing reactions */}
            {reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => handlePostReaction(reaction.emoji)}
                disabled={isReacting}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${reaction.hasReacted
                  ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                title={reaction.users
                  ?.map((u) => u.fullName || u.username)
                  .join(", ")}
              >
                <span className="text-base">{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}

            {/* Add reaction button */}
            <div className="relative">
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                disabled={isReacting}
                className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
              >
                <Smile className="h-4 w-4" />
                <span>Add</span>
              </button>

              {showReactionPicker && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowReactionPicker(false)}
                  />
                  <div className="absolute left-0 bottom-full z-20 mb-2 flex gap-1 rounded-full bg-white p-1.5 shadow-lg ring-1 ring-gray-100">
                    {REACTION_EMOJIS.map((emoji) => {
                      const hasReacted = reactions.find(
                        (r) => r.emoji === emoji
                      )?.hasReacted;
                      return (
                        <button
                          key={emoji}
                          onClick={() => handlePostReaction(emoji)}
                          className={`rounded-full p-1.5 text-xl hover:scale-125 transition-transform ${hasReacted ? "bg-indigo-100" : "hover:bg-gray-100"
                            }`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Comments section */}
        <div className="border-t border-gray-100">
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {comments.length} comments
              </span>
            </div>
          </div>

          {/* Comment form */}
          <form
            onSubmit={handleAddComment}
            className="px-6 py-4 border-b border-gray-100"
          >
            <div className="flex gap-3">
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName || currentUser.username}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white uppercase">
                  {currentUser?.fullName
                    ? currentUser.fullName.slice(0, 2)
                    : currentUser?.username?.slice(0, 2)}
                </div>
              )}
              <div className="flex-1">
                <div className="relative">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 pr-20 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <input
                      ref={commentFileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleCommentFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => commentFileInputRef.current?.click()}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      title="Attach file"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={(!newComment.trim() && commentFiles.length === 0) || isSendingComment || isUploadingComment}
                      className="rounded-full p-1.5 text-indigo-600 hover:bg-indigo-50 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                    >
                      {(isSendingComment || isUploadingComment) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Selected files preview */}
                {commentFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {commentFiles.map((file, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs"
                      >
                        {file.type.startsWith("image/") ? (
                          <Image className="h-3 w-3 text-gray-500" />
                        ) : (
                          <FileText className="h-3 w-3 text-gray-500" />
                        )}
                        <span className="max-w-[100px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCommentFile(index)}
                          className="p-0.5 rounded text-gray-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Comments list - unified scroll with modal */}
          <div>
            {isCommentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
              </div>
            ) : comments.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {comments.map((comment) => {
                  const isCommentAuthor =
                    comment.author?.id === currentUser?.id;
                  const isEditing = editingCommentId === comment.id;
                  const cmtReactions = commentReactions[comment.id] || [];

                  return (
                    <div
                      key={comment.id}
                      className="group px-6 py-4 hover:bg-gray-50/50"
                    >
                      <div className="flex gap-3">
                        {/* Avatar */}
                        {comment.author?.avatarUrl ? (
                          <img
                            src={comment.author.avatarUrl}
                            alt={
                              comment.author.fullName || comment.author.username
                            }
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-400 to-gray-500 text-xs font-bold text-white uppercase">
                            {comment.author?.fullName
                              ? comment.author.fullName.slice(0, 2)
                              : comment.author?.username?.slice(0, 2) || "??"}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          {/* Comment content box */}
                          <div className="inline-block max-w-full">
                            <div className="rounded-2xl bg-gray-100 px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-gray-900">
                                    {comment.author?.fullName ||
                                    comment.author?.username ||
                                    "Anonymous"}
                                </span>
                                {isCommentAuthor && (
                                  <span className="inline-flex items-center rounded bg-indigo-50 px-1 py-0.5 text-[9px] font-medium text-indigo-600">
                                    You
                                  </span>
                                )}
                              </div>

                              {isEditing ? (
                                <div className="mt-1 flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingCommentContent}
                                    onChange={(e) =>
                                      setEditingCommentContent(e.target.value)
                                    }
                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleSaveEditComment(comment.id);
                                      } else if (e.key === "Escape") {
                                        handleCancelEditComment();
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() =>
                                      handleSaveEditComment(comment.id)
                                    }
                                    className="rounded p-1 text-green-600 hover:bg-green-50"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEditComment}
                                    className="rounded p-1 text-gray-400 hover:bg-gray-100"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {comment.content && comment.content.trim() !== " " && (
                                    <p className="mt-0.5 text-base text-gray-800 whitespace-pre-wrap break-words">
                                      {comment.content}
                                    </p>
                                  )}

                                  {/* Link Previews in comment */}
                                  {comment.content && (
                                    <LinkPreviews text={comment.content} authFetch={authFetch} maxPreviews={1} />
                                  )}

                                  {/* Comment attachments */}
                                  {comment.attachments && comment.attachments.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {comment.attachments.map((att) => (
                                        <AttachmentPreview
                                          key={att.id}
                                          attachment={att}
                                          onPreview={(attachment) => setPreviewFile(attachment)}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Comment reactions */}
                            {cmtReactions.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 ml-1">
                                {cmtReactions.map((reaction) => (
                                  <button
                                    key={reaction.emoji}
                                    onClick={() =>
                                      handleCommentReaction(
                                        comment.id,
                                        reaction.emoji
                                      )
                                    }
                                    className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${reaction.hasReacted
                                      ? "bg-indigo-100 text-indigo-700"
                                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                      }`}
                                    title={reaction.users
                                      ?.map((u) => u.fullName || u.username)
                                      .join(", ")}
                                  >
                                    <span>{reaction.emoji}</span>
                                    <span className="font-medium">
                                      {reaction.count}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Comment actions */}
                            <div className="flex items-center gap-3 mt-1 ml-1 text-xs text-gray-500">
                              <span>{formatDate(comment.createdAt)}</span>

                              {/* Like button */}
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setShowCommentReactionPicker(
                                      showCommentReactionPicker === comment.id
                                        ? null
                                        : comment.id
                                    )
                                  }
                                  className="font-medium hover:text-indigo-600 hover:underline"
                                >
                                  Like
                                </button>

                                {showCommentReactionPicker === comment.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-10"
                                      onClick={() =>
                                        setShowCommentReactionPicker(null)
                                      }
                                    />
                                    <div className="absolute left-0 bottom-full z-20 mb-1 flex gap-0.5 rounded-full bg-white p-1 shadow-lg ring-1 ring-gray-100">
                                      {REACTION_EMOJIS.map((emoji) => {
                                        const hasReacted = cmtReactions.find(
                                          (r) => r.emoji === emoji
                                        )?.hasReacted;
                                        return (
                                          <button
                                            key={emoji}
                                            onClick={() =>
                                              handleCommentReaction(
                                                comment.id,
                                                emoji
                                              )
                                            }
                                            className={`rounded-full p-1 text-sm hover:scale-125 transition-transform ${hasReacted
                                              ? "bg-indigo-100"
                                              : "hover:bg-gray-100"
                                              }`}
                                          >
                                            {emoji}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>

                              {comment.updatedAt &&
                                comment.updatedAt !== comment.createdAt && (
                                  <span className="text-gray-400">
                                    (edited)
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Comment menu */}
                        {isCommentAuthor && !isEditing && (
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveCommentMenu(
                                  activeCommentMenu === comment.id
                                    ? null
                                    : comment.id
                                )
                              }
                              className="rounded-full p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600 transition-all"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {activeCommentMenu === comment.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setActiveCommentMenu(null)}
                                />
                                <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-100">
                                  <button
                                    onClick={() => handleEditComment(comment)}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteComment(comment.id)
                                    }
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Delete Comment Confirmation */}
        <ConfirmationModal
          isOpen={deleteCommentConfirm.isOpen}
          onClose={() => setDeleteCommentConfirm({ isOpen: false, commentId: null })}
          onConfirm={confirmDeleteComment}
          title="Delete Comment"
          message="Are you sure you want to delete this comment? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />

        {previewFile && (
          <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
        )}
      </div>
    </div>
  );
}

export default PostDetailModal;
