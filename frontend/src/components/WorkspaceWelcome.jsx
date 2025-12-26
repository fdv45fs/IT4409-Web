import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";

function WorkspaceWelcome() {
  const { workspace } = useOutletContext();
  const { authFetch, currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAdmin = workspace?.myRole === "WORKSPACE_ADMIN";

  useEffect(() => {
    if (workspace?.id) {
      fetchMembers();
    }
  }, [workspace?.id]);

  const fetchMembers = async () => {
    try {
      const data = await authFetch(`/api/workspaces/${workspace.id}/members`);
      setMembers(data.members || []);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  };

  const handleCopyJoinCode = async () => {
    if (workspace?.joinCode) {
      try {
        await navigator.clipboard.writeText(workspace.joinCode);
        setCopied(true);
        addToast("Đã sao chép mã tham gia vào clipboard", "success");
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
        addToast("Không thể sao chép mã", "error");
      }
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header Section */}
      <div className="border-b border-gray-200 bg-white px-8 py-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {workspace?.name}
          </h1>
          <p className="mt-2 text-gray-600">
            {workspace?.description || "Chưa có mô tả"}
          </p>
        </div>

        {/* Join Code Card */}
        {isAdmin && workspace?.joinCode && (
          <div className="mt-6 flex max-w-md items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-4">
            <div>
              <p className="text-sm font-medium text-blue-900">
                Mã tham gia Workspace
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-blue-700 tracking-wider">
                {workspace.joinCode}
              </p>
            </div>
            <button
              onClick={handleCopyJoinCode}
              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50 border border-blue-200 transition"
            >
              {copied ? "Đã sao chép!" : "Sao chép"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspaceWelcome;
