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
import { useMeetingContext } from "../contexts/MeetingContext";
import UpdateChannelModal from "./UpdateChannelModal";
import AddChannelMemberModal from "./AddChannelMemberModal";
import ChannelMembersModal from "./ChannelMembersModal";
import ChannelJoinRequestsModal from "./ChannelJoinRequestsModal";
import ChannelFiles from "./ChannelFiles";
import ChannelMeeting from "./ChannelMeeting";
import ChannelChat from "./ChannelChat";

function ChannelDetail() {
  const { channelId } = useParams();
  const { workspace, refreshChannels } = useOutletContext();
  const { currentUser, authFetch } = useAuth();
  const { addToast } = useToast();
  const { isInMeeting, setIsInMeeting } = useMeetingContext();
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
  const [isMeetingMinimized, setIsMeetingMinimized] = useState(false);

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
    [channelId, authFetch, addToast]
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
    [channelId, authFetch, addToast]
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
    [channelId, authFetch, addToast]
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
      await addPostComment(
        channelId,
        selectedPostId,
        commentContent.trim(),
        authFetch
      );
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

  const handleMeetingStateChange = (joined) => {
    setIsInMeeting(joined);
    if (!joined) {
      setIsMeetingMinimized(false);
    }
  };

  const toggleMeetingMinimize = () => {
    const next = !isMeetingMinimized;
    setIsMeetingMinimized(next);
    if (next && activeTab === "meeting") {
      setActiveTab("chat");
    }
    if (!next) {
      setActiveTab("meeting");
    }
  };

  const hideChrome = isInMeeting && !isMeetingMinimized;

  return (
    <div className="flex h-full flex-col">
      {/* Header - Hide when in full meeting mode */}
      {!hideChrome && (
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3">
          <div>
            <div className="flex items-center gap-2">
              {channel.isPrivate ? (
                <svg
                  width="30px"
                  height="30px"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    {" "}
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M4 6V4C4 1.79086 5.79086 0 8 0C10.2091 0 12 1.79086 12 4V6H14V16H2V6H4ZM6 4C6 2.89543 6.89543 2 8 2C9.10457 2 10 2.89543 10 4V6H6V4ZM7 13V9H9V13H7Z"
                      fill="#000000"
                    ></path>{" "}
                  </g>
                </svg>
              ) : (
                <svg
                  version="1.0"
                  id="Layer_1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlns:xlink="http://www.w3.org/1999/xlink"
                  width="30px"
                  height="30px"
                  viewBox="0 0 64 64"
                  enable-background="new 0 0 64 64"
                  xml:space="preserve"
                  fill="#000000"
                >
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    {" "}
                    <path
                      fill="#231F20"
                      d="M32,0C15.776,0,2.381,12.077,0.292,27.729c-0.002,0.016-0.004,0.031-0.006,0.047 c-0.056,0.421-0.106,0.843-0.146,1.269c-0.019,0.197-0.029,0.396-0.045,0.594c-0.021,0.28-0.044,0.56-0.058,0.842 C0.014,30.983,0,31.49,0,32c0,17.673,14.327,32,32,32s32-14.327,32-32S49.673,0,32,0z M33.362,58.502 c-0.72,0.787-1.901,1.414-2.675,0.67c-0.653-0.644-0.099-1.44,0-2.353c0.125-1.065-0.362-2.345,0.666-2.676 c0.837-0.259,1.468,0.322,2.009,1.012C34.187,56.175,34.239,57.526,33.362,58.502z M43.446,49.87 c-1.18,0.608-2.006,0.494-3.323,0.673c-2.454,0.309-4.394,1.52-6.333,0c-0.867-0.695-0.978-1.451-1.65-2.341 c-1.084-1.364-1.355-3.879-3.01-3.322c-1.058,0.356-1.026,1.415-1.654,2.335c-0.81,1.156-0.607,2.793-2.005,2.993 c-0.974,0.138-1.499-0.458-2.321-1c-0.922-0.614-1.104-1.348-2.002-1.993c-0.934-0.689-1.69-0.693-2.654-1.334 c-0.694-0.463-0.842-1.304-1.673-1.334c-0.751-0.022-1.289,0.346-1.664,0.996c-0.701,1.214-0.942,4.793-2.988,4.665 c-1.516-0.103-4.758-3.509-5.994-4.327c-0.405-0.273-0.78-0.551-1.158-0.763c-1.829-3.756-2.891-7.952-2.997-12.385 c0.614-0.515,1.239-0.769,1.819-1.493c0.927-1.13,0.481-2.507,1.673-3.335c0.886-0.604,1.602-0.507,2.669-0.658 c1.529-0.222,2.491-0.422,3.988,0c1.459,0.409,2.016,1.246,3.326,1.992c1.415,0.81,2.052,1.766,3.66,2.001 c1.166,0.165,1.966-0.901,2.988-0.337c0.824,0.458,1.406,1.066,1.341,2.001c-0.1,1.218-2.522,0.444-2.659,1.662 c-0.183,1.558,2.512-0.194,3.992,0.33c0.974,0.355,2.241,0.294,2.325,1.334c0.081,1.156-1.608,0.837-2.657,1.335 c-1.162,0.541-1.771,0.996-3.004,1.329c-1.125,0.298-2.312-0.628-2.987,0.329c-0.53,0.742-0.343,1.489,0,2.335 c0.787,1.931,3.349,1.352,5.322,0.657c1.383-0.488,1.641-1.726,2.997-2.329c1.438-0.641,2.554-1.335,3.981-0.663 c1.178,0.556,0.849,2.05,2.006,2.663c1.253,0.668,2.432-0.729,3.663,0c0.957,0.569,0.887,1.521,1.655,2.327 c0.894,0.942,1.41,1.702,2.668,2c1.286,0.299,2.072-1.071,3.327-0.671c0.965,0.315,1.755,0.68,1.987,1.672 C46.465,48.634,44.744,49.198,43.446,49.87z M45.839,33.841c-1.154,1.16-2.156,1.539-3.771,1.893c-1.433,0.315-3.443,1.438-3.772,0 c-0.251-1.148,1.029-1.558,1.893-2.359c0.959-0.895,1.854-0.983,2.826-1.892c0.87-0.802,0.756-2.031,1.893-2.359 c1.109-0.32,2.182-0.019,2.825,0.947C48.652,31.438,47.006,32.681,45.839,33.841z M59.989,29.319 c-0.492,0.508-0.462,1.044-0.965,1.542c-0.557,0.539-1.331,0.307-1.738,0.968c-0.358,0.577-0.13,1.057-0.194,1.735 c-0.041,0.387-1.924,1.256-2.313,0.385c-0.214-0.481,0.281-0.907,0-1.353c-0.263-0.401-0.555-0.195-0.899,0.181 c-0.359,0.388-0.772,0.958-1.221,1.172c-0.589,0.273-0.196-2.25-0.395-3.088c-0.146-0.663,0.01-1.08,0.198-1.736 c0.25-0.91,0.938-1.206,1.155-2.125c0.194-0.806,0.033-1.295,0-2.123c-0.039-0.906-0.015-1.427-0.188-2.314 c-0.192-0.937-0.252-1.525-0.771-2.316c-0.418-0.624-0.694-1.001-1.354-1.352c-0.16-0.088-0.31-0.146-0.452-0.191 c-0.34-0.113-0.659-0.128-1.098-0.193c-0.888-0.132-1.522,0.432-2.314,0c-0.462-0.255-0.606-0.575-0.96-0.967 c-0.404-0.434-0.511-0.789-0.967-1.158c-0.341-0.276-0.552-0.437-0.965-0.581c-0.79-0.263-1.342-0.082-2.126,0.196 c-0.77,0.268-1.058,0.707-1.739,1.155c-0.522,0.303-0.893,0.371-1.348,0.774c-0.276,0.242-1.59,1.177-2.127,1.155 c-0.544-0.021-0.851-0.343-1.338-0.382c-0.065-0.008-0.13-0.008-0.204,0c0,0,0,0-0.005,0c-0.473,0.036-0.696,0.269-1.146,0.382 c-1.107,0.276-1.812-0.115-2.905,0.197c-0.712,0.2-0.993,0.766-1.73,0.771c-0.841,0.005-1.125-0.743-1.932-0.968 c-0.442-0.118-0.702-0.129-1.157-0.19c-0.749-0.108-1.178-0.119-1.926-0.191H24.86c-0.016,0.006-0.591,0.058-0.688,0 c-0.422-0.286-0.722-0.521-1.244-0.773c-0.575-0.283-0.919-0.428-1.547-0.584l0.026-0.381c0,0,0-0.847-0.121-1.207 c-0.115-0.361-0.24-0.361,0-1.086c0.248-0.722,0.679-1.182,0.679-1.182c0.297-0.228,0.516-0.305,0.769-0.58 c0.51-0.539,0.717-0.998,0.774-1.739c0.067-0.972-1.205-1.367-0.97-2.316c0.209-0.826,0.904-0.98,1.547-1.543 c0.779-0.67,1.468-0.758,2.12-1.542c0.501-0.593,0.911-0.965,0.97-1.738c0.053-0.657-0.23-1.068-0.57-1.538 C28.356,2.175,30.157,2,32,2c14.919,0,27.29,10.893,29.605,25.158c-0.203,0.352-0.001,0.796-0.27,1.193 C60.979,28.894,60.436,28.85,59.989,29.319z"
                    ></path>{" "}
                  </g>
                </svg>
              )}

              <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                {channel.name}
              </h2>
            </div>

            {channel.description && (
              <p className="text-sm text-gray-500">{channel.description}</p>
            )}

            {channel.joinCode && (
              <div
                className="mt-1 flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(channel.joinCode);
                  addToast("Đã sao chép mã tham gia channel", "success");
                }}
              >
                <span>Mã tham gia: {channel.joinCode}</span>

                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 11C6 8.17157 6 6.75736 6.87868 5.87868C7.75736 5 9.17157 5 12 5H15C17.8284 5 19.2426 5 20.1213 5.87868C21 6.75736 21 8.17157 21 11V16C21 18.8284 21 20.2426 20.1213 21.1213C19.2426 22 17.8284 22 15 22H12C9.17157 22 7.75736 22 6.87868 21.1213C6 20.2426 6 18.8284 6 16V11Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                  <path
                    d="M6 19C4.34315 19 3 17.6569 3 16V10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H15C16.6569 2 18 3.34315 18 5"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                </svg>
              </div>
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
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              title="Rời khỏi channel"
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Rời khỏi</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      {!hideChrome && (
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px px-6">
            <button
              onClick={() => {
                setActiveTab("posts");
                if (isInMeeting && !isMeetingMinimized)
                  setIsMeetingMinimized(true);
              }}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "posts"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Bài đăng
            </button>
            <button
              onClick={() => {
                setActiveTab("chat");
                if (isInMeeting && !isMeetingMinimized)
                  setIsMeetingMinimized(true);
              }}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "chat"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => {
                setActiveTab("meeting");
                setIsMeetingMinimized(false);
              }}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "meeting"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              🎥 Meeting
            </button>
            <button
              onClick={() => {
                setActiveTab("files");
                if (isInMeeting && !isMeetingMinimized)
                  setIsMeetingMinimized(true);
              }}
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
        {/* Posts Tab */}
        <div
          className="h-full overflow-y-auto absolute inset-0"
          style={{
            display:
              activeTab === "posts" && (!isInMeeting || isMeetingMinimized)
                ? "block"
                : "none",
          }}
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
            <form
              onSubmit={handleCreatePost}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 uppercase">
                  {currentUser?.fullName
                    ? currentUser.fullName.slice(0, 2)
                    : currentUser?.username?.slice(0, 2)}
                </div>
                <div className="flex-1 space-y-3">
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder={`Chia sẻ với #${channel.name}...`}
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Bài đăng sẽ hiển thị cho tất cả thành viên trong channel.
                    </p>
                    <button
                      type="submit"
                      disabled={isPosting}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {isPosting ? "Đang gửi..." : "Đăng bài"}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Danh sách bài đăng
                </h3>
                {isPostsLoading && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></span>
                    Đang tải...
                  </div>
                )}
              </div>

              {posts.length === 0 && !isPostsLoading && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  Chưa có bài đăng nào trong channel này.
                </div>
              )}

              {posts.length > 0 && (
                <div className="space-y-4 p-4">
                  {posts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => openPostDetail(post.id)}
                      className="group w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-slate-100 text-sm font-semibold text-indigo-700 uppercase">
                          {post.author?.fullName
                            ? post.author.fullName.slice(0, 2)
                            : post.author?.username?.slice(0, 2) || "??"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-semibold text-gray-900">
                              {post.author?.fullName ||
                                post.author?.username ||
                                "Ẩn danh"}
                            </span>
                            {post.createdAt && (
                              <span className="text-xs text-gray-500">
                                {new Date(post.createdAt).toLocaleString(
                                  "vi-VN"
                                )}
                              </span>
                            )}
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                              Bài đăng
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                            {post.content}
                          </p>
                          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                              Nhấp để xem chi tiết
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Tab */}
        <div
          className="h-full absolute inset-0"
          style={{
            display:
              activeTab === "chat" && (!isInMeeting || isMeetingMinimized)
                ? "block"
                : "none",
          }}
        >
          <ChannelChat
            channelId={channelId}
            channelName={channel.name}
            members={members}
          />
        </div>

        {/* Meeting Tab - Always mounted to keep video state */}
        <div
          className={`h-full absolute inset-0 ${
            isMeetingMinimized && activeTab !== "meeting"
              ? "pointer-events-none"
              : ""
          }`}
          style={{
            display: activeTab === "meeting" || isInMeeting ? "block" : "none",
          }}
        >
          <ChannelMeeting
            channelId={channelId}
            isChannelAdmin={isChannelAdmin}
            onMeetingStateChange={handleMeetingStateChange}
            isMinimized={isMeetingMinimized}
            onToggleMinimize={toggleMeetingMinimize}
          />
        </div>

        {/* Files Tab */}
        <div
          className="h-full overflow-y-auto absolute inset-0"
          style={{
            display:
              activeTab === "files" && (!isInMeeting || isMeetingMinimized)
                ? "block"
                : "none",
          }}
        >
          <ChannelFiles channelId={channelId} isChannelAdmin={isChannelAdmin} />
        </div>
      </div>

      {/* Post detail modal */}
      {isPostDetailOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 px-4 py-10 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                Chi tiết bài đăng
              </h3>
              <button
                onClick={() => setIsPostDetailOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
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
                      {postDetail.author?.fullName
                        ? postDetail.author.fullName.slice(0, 2)
                        : postDetail.author?.username?.slice(0, 2) || "??"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {postDetail.author?.fullName ||
                            postDetail.author?.username ||
                            "Ẩn danh"}
                        </p>
                        {postDetail.createdAt && (
                          <span className="text-xs text-gray-500">
                            {new Date(postDetail.createdAt).toLocaleString(
                              "vi-VN"
                            )}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
                        {postDetail.content}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Bình luận
                      </h4>
                      <span className="text-xs text-gray-500">
                        {postComments?.length ?? 0} bình luận
                      </span>
                    </div>

                    <div className="px-4 py-3">
                      <form
                        onSubmit={handleAddComment}
                        className="flex items-start gap-3"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 uppercase">
                          {currentUser?.fullName
                            ? currentUser.fullName.slice(0, 2)
                            : currentUser?.username?.slice(0, 2)}
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
                      <div className="px-4 py-4 text-sm text-gray-500">
                        Đang tải bình luận...
                      </div>
                    ) : postComments?.length ? (
                      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto pr-1">
                        {postComments.map((cmt) => (
                          <div key={cmt.id} className="px-4 py-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 uppercase">
                                {cmt.author?.fullName
                                  ? cmt.author.fullName.slice(0, 2)
                                  : cmt.author?.username?.slice(0, 2) || "??"}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {cmt.author?.fullName ||
                                      cmt.author?.username ||
                                      "Ẩn danh"}
                                  </p>
                                  {cmt.createdAt && (
                                    <span className="text-xs text-gray-500">
                                      {new Date(cmt.createdAt).toLocaleString(
                                        "vi-VN"
                                      )}
                                    </span>
                                  )}
                                  {(cmt.author?.id === currentUser?.id ||
                                    cmt.authorId === currentUser?.id) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteComment(cmt.id)
                                      }
                                      className="text-xs font-medium text-red-500 hover:text-red-600"
                                    >
                                      Xóa
                                    </button>
                                  )}
                                </div>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                                  {cmt.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-5 text-sm text-gray-500">
                        Chưa có bình luận nào.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-6 py-6 text-sm text-red-500">
                  Không tải được chi tiết bài đăng.
                </div>
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
