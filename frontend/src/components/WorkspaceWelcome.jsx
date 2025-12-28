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
        addToast("Copied join code to clipboard", "success");
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
        addToast("Failed to copy code", "error");
      }
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header Section */}
      <div className="border-b border-gray-200 bg-white px-8 py-6 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome Back to {workspace?.name} Workspace
        </h1>
      </div>
    </div>
  );
}

export default WorkspaceWelcome;
