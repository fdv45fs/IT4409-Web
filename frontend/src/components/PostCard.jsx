import { useState } from "react";
import {
  MessageCircle,
  MoreHorizontal,
  Edit2,
  Trash2,
  Smile,
  Image,
  FileText,
  Download,
  X,
} from "lucide-react";
import LinkPreviews from "./LinkPreview";
import { FileArchive, FileAudio, FileVideo } from "lucide-react";
import FilePreviewModal from "./FilePreviewModal";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👏"];

function PostCard({
  post,
  currentUser,
  authFetch,
  onViewDetail,
  onEdit,
  onDelete,
  onToggleReaction,
  isReacting = false,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  const isAuthor = post.author?.id === currentUser?.id;
  const createdDate = post.createdAt
          ? new Date(post.createdAt).toLocaleString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    : "";

  const reactions = post.reactions || [];
  const attachments = post.attachments || [];

  // Check if file is an image
  const isImage = (mimeType) => mimeType?.startsWith("image/");
  const isVideo = (mimeType) => mimeType?.startsWith("video/");

  const imageAttachments = attachments.filter((a) => isImage(a.mimeType));
  const videoAttachments = attachments.filter((a) => isVideo(a.mimeType));
  const otherAttachments = attachments.filter(
    (a) => !isImage(a.mimeType) && !isVideo(a.mimeType)
  );

  const handleReactionClick = (emoji) => {
    onToggleReaction?.(post.id, emoji);
    setShowReactionPicker(false);
  };

  return (
    <article className="group relative rounded-2xl border border-gray-300 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-500">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 pt-5">
        {/* Avatar */}
        {post.author?.avatarUrl ? (
          <img
            src={post.author.avatarUrl}
            alt={post.author.fullName || post.author.username}
            className="h-11 w-11 rounded-full object-cover ring-2 ring-gray-50"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white uppercase shadow-inner">
            {post.author?.fullName
              ? post.author.fullName.slice(0, 2)
              : post.author?.username?.slice(0, 2) || "??"}
          </div>
        )}

        {/* Author info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {post.author?.fullName || post.author?.username || "Anonymous"}
            </h4>
            {isAuthor && (
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                You
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{createdDate}</p>
        </div>

        {/* Menu */}
        {isAuthor && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-full p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600 transition-all"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl bg-white py-1.5 shadow-lg ring-1 ring-gray-100">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit?.(post);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete?.(post.id);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap line-clamp-6">
          {post.content}
        </p>
        {post.content?.length > 300 && (
          <button
            onClick={() => onViewDetail?.(post.id)}
            className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            View more...
          </button>
        )}

        {/* Link Previews */}
        {authFetch && <LinkPreviews text={post.content} authFetch={authFetch} maxPreviews={1} />}
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="px-5 pb-3 space-y-3">
          {/* Videos */}
          {videoAttachments.length > 0 && (
            <div className="space-y-2">
              {videoAttachments.map((att) => (
                <div
                  key={att.id}
                  className="relative aspect-video rounded-lg overflow-hidden bg-black/80"
                >
                  <video
                    src={att.fileUrl}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewFile(att)}
                    className="absolute top-2 right-2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-black/80"
                  >
                    Zoom
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Images grid */}
          {imageAttachments.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {imageAttachments.slice(0, 4).map((att, idx) => (
                <div
                  key={att.id}
                  className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setPreviewFile(att)}
                >
                  <img
                    src={att.fileUrl}
                    alt={att.fileName}
                    className="w-full h-full object-cover"
                  />
                  {idx === 3 && imageAttachments.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-lg font-semibold">
                        +
                        {imageAttachments.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Other files */}
          {otherAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {otherAttachments.map((att) => {
                const ext = (att.fileName || att.fileUrl || "").split("?")[0].split(".").pop()?.toLowerCase() || "";
                const typeInfo = (() => {
                  if (ext === "pdf") return { icon: FileText, color: "text-red-600", border: "border-red-200" };
                  if (["doc", "docx"].includes(ext)) return { icon: FileText, color: "text-blue-600", border: "border-blue-200" };
                  if (["xls", "xlsx"].includes(ext)) return { icon: FileText, color: "text-green-600", border: "border-green-200" };
                  if (["ppt", "pptx"].includes(ext)) return { icon: FileText, color: "text-orange-600", border: "border-orange-200" };
                  if (["zip", "rar"].includes(ext)) return { icon: FileArchive, color: "text-purple-600", border: "border-purple-200" };
                  if (["mp3", "wav", "m4a"].includes(ext)) return { icon: FileAudio, color: "text-indigo-600", border: "border-indigo-200" };
                  if (["mp4", "mov", "avi", "mkv"].includes(ext)) return { icon: FileVideo, color: "text-teal-600", border: "border-teal-200" };
                  return { icon: FileText, color: "text-gray-600", border: "border-gray-200" };
                })();
                const Icon = typeInfo.icon;
                return (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => setPreviewFile(att)}
                    className={`inline-flex items-center gap-2 rounded-lg bg-white ${typeInfo.border} border-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm`}
                  >
                    <Icon className={`h-4 w-4 ${typeInfo.color}`} />
                    <span className="max-w-[150px] truncate">
                      {att.fileName}
                    </span>
                    <Download className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reactions display */}
      {reactions.length > 0 && (
        <div className="flex items-center gap-1.5 px-5 pb-3">
          {reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              onClick={() => handleReactionClick(reaction.emoji)}
              disabled={isReacting}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-all ${reaction.hasReacted
                  ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              title={reaction.users
                ?.map((u) => u.fullName || u.username)
                .join(", ")}
            >
              <span>{reaction.emoji}</span>
              <span className="font-medium">{reaction.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-gray-50 px-3 py-2">
        {/* Reaction button */}
        <div className="relative">
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            disabled={isReacting}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            <Smile className="h-4 w-4" />
            <span className="hidden sm:inline">Like</span>
          </button>

          {showReactionPicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowReactionPicker(false)}
              />
              <div className="absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-full bg-white p-1.5 shadow-lg ring-1 ring-gray-100">
                {REACTION_EMOJIS.map((emoji) => {
                  const hasReacted = reactions.find(
                    (r) => r.emoji === emoji
                  )?.hasReacted;
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReactionClick(emoji)}
                      className={`rounded-full p-1.5 text-lg hover:scale-125 transition-transform ${hasReacted ? "bg-indigo-100" : "hover:bg-gray-100"
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

        {/* Comment button */}
        <button
          onClick={() => onViewDetail?.(post.id)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          <span>
            {post.commentCount || 0}{" "}
            <span className="hidden sm:inline">comments</span>
          </span>
        </button>

        {/* Attachments count */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-500 px-2">
            <Image className="h-4 w-4" />
            <span>{attachments.length}</span>
          </div>
        )}

        {/* View detail */}
        <button
          onClick={() => onViewDetail?.(post.id)}
          className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
        >
          View Details
        </button>
      </div>
      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </article>
  );
}

export default PostCard;
