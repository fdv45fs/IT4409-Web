import { useState, useEffect, useCallback } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import {
  leaveChannel,
  createPost,
  getPosts,
  getPostDetail,
  getPostComments,
  addPostComment,
  deletePostComment,
} from "../api";
import useAuth from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";
import UpdateChannelModal from "./UpdateChannelModal";
import AddChannelMemberModal from "./AddChannelMemberModal";
import ChannelMembersModal from "./ChannelMembersModal";
import ChannelJoinRequestsModal from "./ChannelJoinRequestsModal";
import ChannelFiles from "./ChannelFiles";
import ChannelMeeting from "./ChannelMeeting";

function ChannelDetail() {
  const { channelId } = useParams();
  const { workspace, refreshChannels } = useOutletContext();
  const { currentUser, authFetch } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [channel, setChannel] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isPostDetailOpen, setIsPostDetailOpen] = useState(false);
  const [isPostDetailLoading, setIsPostDetailLoading] = useState(false);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  const [postContent, setPostContent] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [postDetail, setPostDetail] = useState(null);
  const [postComments, setPostComments] = useState([]);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [isInMeeting, setIsInMeeting] = useState(false); // Track if user is in a meeting

  const fetchChannelData = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const [channelData, membersData] = await Promise.all([
          authFetch(`/api/channels/${channelId}`),
          authFetch(`/api/channels/${channelId}/members`),
        ]);
        setChannel(channelData);
        setMembers(membersData);
      } catch (err) {
        addToast(err.message || "Không tải được thông tin channel", "error");
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [channelId, authFetch, addToast],
  );

  const fetchPosts = useCallback(async () => {
    setIsPostsLoading(true);
    try {
      const data = await getPosts(channelId, authFetch);
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast(err.message || "Không tải được danh sách bài đăng", "error");
    } finally {
      setIsPostsLoading(false);
    }
  }, [channelId, authFetch, addToast]);

  const fetchPostDetail = useCallback(
    async (postId) => {
      setIsPostDetailLoading(true);
      try {
        const detail = await getPostDetail(channelId, postId, authFetch);
        setPostDetail(detail);
        setIsPostDetailOpen(true);
      } catch (err) {
        addToast(err.message || "Không tải được chi tiết bài đăng", "error");
      } finally {
        setIsPostDetailLoading(false);
      }
    },
    [channelId, authFetch, addToast],
  );

  const fetchComments = useCallback(
    async (postId) => {
      setIsCommentsLoading(true);
      try {
        const data = await getPostComments(channelId, postId, authFetch);
        setPostComments(Array.isArray(data) ? data : []);
      } catch (err) {
        addToast(err.message || "Không tải được bình luận", "error");
      } finally {
        setIsCommentsLoading(false);
      }
    },
    [channelId, authFetch, addToast],
  );

  useEffect(() => {
    fetchChannelData();
    fetchPosts();
  }, [fetchChannelData, fetchPosts]);

  const handleUpdateSuccess = (updatedChannel) => {
    setChannel(updatedChannel);
    setIsUpdateModalOpen(false);
    if (refreshChannels) refreshChannels();
  };

  const handleDeleteSuccess = () => {
    setIsUpdateModalOpen(false);
    if (refreshChannels) refreshChannels();
    navigate(`/workspaces/${workspace.id}`);
  };

  const handleAddMemberSuccess = () => {
    fetchChannelData(true);
  };

  const handleLeaveChannel = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn rời khỏi channel này?")) return;
    try {
      await leaveChannel(channelId, authFetch);
      if (refreshChannels) refreshChannels();
      navigate(`/workspace/${workspace.id}`);
    } catch (err) {
      addToast(err.message || "Không thể rời channel", "error");
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postContent.trim()) {
      addToast("Nội dung không được để trống", "error");
      return;
    }
    setIsPosting(true);
    try {
      await createPost(channelId, { content: postContent.trim() }, authFetch);
      addToast("Đã tạo bài đăng", "success");
      setPostContent("");
      fetchPosts();
    } catch (err) {
      addToast(err.message || "Không tạo được bài đăng", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const openPostDetail = (postId) => {
    setSelectedPostId(postId);
    fetchPostDetail(postId);
    fetchComments(postId);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim() || !selectedPostId) return;
    setIsCommenting(true);
    try {
      await addPostComment(channelId, selectedPostId, commentContent.trim(), authFetch);
      setCommentContent("");
      fetchComments(selectedPostId);
      fetchPostDetail(selectedPostId);
    } catch (err) {
      addToast(err.message || "Không gửi được bình luận", "error");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!selectedPostId) return;
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này?")) return;
    try {
      await deletePostComment(channelId, selectedPostId, commentId, authFetch);
      fetchComments(selectedPostId);
      fetchPostDetail(selectedPostId);
    } catch (err) {
      addToast(err.message || "Không xóa được bình luận", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!channel) return <div className="p-6">Channel không tồn tại</div>;

  const isWorkspaceAdmin = workspace?.myRole === "WORKSPACE_ADMIN";
  const isChannelAdmin = channel?.myRole === "CHANNEL_ADMIN";
  const canManage = isWorkspaceAdmin || isChannelAdmin;

  return (
    <div className="flex h-full flex-col">
      {/* Header - Hide when in meeting */}
      {!isInMeeting && (
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">
              {channel.isPrivate ? "🔒" : "#"} {channel.name}
            </h2>
          </div>
          {channel.description && (
            <p className="text-sm text-gray-500">{channel.description}</p>
          )}
          {channel.joinCode && (
            <p
              className="mt-1 cursor-pointer text-xs text-gray-400 hover:text-gray-600"
              onClick={() => {
                navigator.clipboard.writeText(channel.joinCode);
                addToast("Đã sao chép mã tham gia channel", "success");
              }}
            >
              Mã tham gia: {channel.joinCode} (Sao chép)
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMembersModalOpen(true)}
            className="text-sm font-medium text-gray-600 hover:underline"
          >
            {members.length} thành viên
          </button>

          {canManage && (
            <>
              {channel.isPrivate && (
                <button
                  onClick={() => setIsRequestsModalOpen(true)}
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  Yêu cầu tham gia
                </button>
              )}

              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                + Thêm thành viên
              </button>
              <button
                onClick={() => setIsUpdateModalOpen(true)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Cài đặt channel"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </>
          )}

          <button
            onClick={handleLeaveChannel}
            className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
            title="Rời channel"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
      )}

      {/* Tabs */}
      {!isInMeeting && (
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px px-6">
          <button
            onClick={() => setActiveTab("chat")}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "chat"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab("meeting")}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "meeting"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            🎥 Meeting
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "files"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            📁 Files & Materials
          </button>
        </nav>
      </div>
      )}

      {/* Main Content - Keep all tabs mounted to prevent unmounting */}
      <div className="flex-1 overflow-hidden relative">
        {/* Chat Tab */}
        <div
          className="h-full overflow-y-auto absolute inset-0"
          style={{ display: activeTab === "chat" && !isInMeeting ? "block" : "none" }}
        >
          <div className="flex h-full items-center justify-center p-6 text-gray-400">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Welcome to #{channel.name}!</h3>
              <p>This is the start of the {channel.name} channel.</p>
              <p className="mt-2 text-sm text-gray-500">{members.length} members</p>
            </div>
          </div>
        </div>

        {/* Meeting Tab - Always mounted to keep video state */}
        <div
          className="h-full absolute inset-0"
          style={{ display: activeTab === "meeting" || isInMeeting ? "block" : "none" }}
        >
          <ChannelMeeting
            channelId={channelId}
            isChannelAdmin={isChannelAdmin}
            onMeetingStateChange={setIsInMeeting}
          />
        </div>

        {/* Files Tab */}
        <div
          className="h-full overflow-y-auto absolute inset-0"
          style={{ display: activeTab === "files" && !isInMeeting ? "block" : "none" }}
        >
          <ChannelFiles channelId={channelId} isChannelAdmin={isChannelAdmin} />
        </div>
      </div>

      {/* Post detail modal */}
      {isPostDetailOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 px-4 py-10 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">Chi tiết bài đăng</h3>
              <button onClick={() => setIsPostDetailOpen(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto">
              {isPostDetailLoading ? (
                <div className="px-6 py-10 text-center text-sm text-gray-500">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                  <p className="mt-3">Đang tải chi tiết bài đăng...</p>
                </div>
              ) : postDetail ? (
                <div className="space-y-6 px-6 py-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 uppercase">
                      {postDetail.author?.fullName ? postDetail.author.fullName.slice(0, 2) : postDetail.author?.username?.slice(0, 2) || "??"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {postDetail.author?.fullName || postDetail.author?.username || "Ẩn danh"}
                        </p>
                        {postDetail.createdAt && <span className="text-xs text-gray-500">{new Date(postDetail.createdAt).toLocaleString("vi-VN")}</span>}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{postDetail.content}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <h4 className="text-sm font-semibold text-gray-900">Bình luận</h4>
                      <span className="text-xs text-gray-500">{(postComments?.length ?? 0)} bình luận</span>
                    </div>

                    <div className="px-4 py-3">
                      <form onSubmit={handleAddComment} className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 uppercase">
                          {currentUser?.fullName ? currentUser.fullName.slice(0, 2) : currentUser?.username?.slice(0, 2)}
                        </div>
                        <div className="flex-1 space-y-2">
                          <textarea
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            placeholder="Viết bình luận..."
                            className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            rows={2}
                          />
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={isCommenting}
                              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                              {isCommenting ? "Đang gửi..." : "Gửi bình luận"}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>

                    {isCommentsLoading ? (
                      <div className="px-4 py-4 text-sm text-gray-500">Đang tải bình luận...</div>
                    ) : postComments?.length ? (
                      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto pr-1">
                        {postComments.map((cmt) => (
                          <div key={cmt.id} className="px-4 py-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 uppercase">
                                {cmt.author?.fullName ? cmt.author.fullName.slice(0, 2) : cmt.author?.username?.slice(0, 2) || "??"}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {cmt.author?.fullName || cmt.author?.username || "Ẩn danh"}
                                  </p>
                                  {cmt.createdAt && <span className="text-xs text-gray-500">{new Date(cmt.createdAt).toLocaleString("vi-VN")}</span>}
                                  {(cmt.author?.id === currentUser?.id || cmt.authorId === currentUser?.id) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(cmt.id)}
                                      className="text-xs font-medium text-red-500 hover:text-red-600"
                                    >
                                      Xóa
                                    </button>
                                  )}
                                </div>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{cmt.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-5 text-sm text-gray-500">Chưa có bình luận nào.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-6 py-6 text-sm text-red-500">Không tải được chi tiết bài đăng.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {isUpdateModalOpen && (
        <UpdateChannelModal
          channel={channel}
          onClose={() => setIsUpdateModalOpen(false)}
          onSuccess={handleUpdateSuccess}
          onDelete={handleDeleteSuccess}
        />
      )}

      {isAddMemberModalOpen && (
        <AddChannelMemberModal
          workspaceId={workspace.id}
          channelId={channelId}
          onClose={() => setIsAddMemberModalOpen(false)}
          onSuccess={handleAddMemberSuccess}
        />
      )}

      {isMembersModalOpen && (
        <ChannelMembersModal
          channelId={channelId}
          onClose={() => setIsMembersModalOpen(false)}
          onUpdate={() => fetchChannelData(true)}
        />
      )}

      {isRequestsModalOpen && (
        <ChannelJoinRequestsModal
          channelId={channelId}
          onClose={() => setIsRequestsModalOpen(false)}
          onUpdate={() => fetchChannelData(true)}
        />
      )}
    </div>
  );
}

export default ChannelDetail;
