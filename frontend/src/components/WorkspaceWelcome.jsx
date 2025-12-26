import { useOutletContext, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";
import { useState, useEffect } from "react";
import { Copy, Check, Hash, ArrowRight } from "lucide-react";

function WorkspaceWelcome() {
    const { workspace } = useOutletContext();
    const { authFetch, currentUser } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [channels, setChannels] = useState([]);
    const [copied, setCopied] = useState(false);

    const isAdmin = workspace?.myRole === "WORKSPACE_ADMIN";

    useEffect(() => {
        if (workspace?.id) {
            authFetch(`/api/channels?workspaceId=${workspace.id}`)
                .then(setChannels)
                .catch(console.error);
        }
    }, [workspace?.id]);

    const handleCopy = async () => {
        if (workspace?.joinCode) {
            await navigator.clipboard.writeText(workspace.joinCode);
            setCopied(true);
            addToast("Đã sao chép mã mời", "success");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="flex h-full flex-col items-center justify-center p-8">
            <div className="max-w-sm w-full text-center">
                {/* Welcome */}
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {workspace?.name}
                </h1>
                <p className="text-gray-600 mb-8">
                    Xin chào, {currentUser?.fullName || currentUser?.username}!
                </p>

                {/* Join Code for Admin */}
                {isAdmin && workspace?.joinCode && (
                    <div className="mb-8 rounded-lg border bg-gray-50 p-4">
                        <p className="text-xs text-gray-500 mb-1">Mã mời thành viên</p>
                        <div className="flex items-center justify-center gap-3">
                            <code className="text-xl font-bold text-gray-900 tracking-wider">
                                {workspace.joinCode}
                            </code>
                            <button
                                onClick={handleCopy}
                                className={`p-2 rounded transition ${copied ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                    }`}
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* Quick Start */}
                {channels.length > 0 && (
                    <button
                        onClick={() => navigate(`/workspace/${workspace.id}/channel/${channels[0].id}`)}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 transition"
                    >
                        <Hash className="h-4 w-4" />
                        Đến #{channels[0].name}
                        <ArrowRight className="h-4 w-4" />
                    </button>
                )}

                <p className="mt-6 text-sm text-gray-400">
                    Hoặc chọn channel từ sidebar
                </p>
            </div>
        </div>
    );
}

export default WorkspaceWelcome;
