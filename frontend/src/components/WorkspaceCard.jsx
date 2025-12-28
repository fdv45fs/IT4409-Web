function WorkspaceCard({ workspace, onClick }) {
  const getRoleBadge = (role) => {
    const badges = {
      WORKSPACE_ADMIN: {
        text: "Admin",
        class: "bg-purple-500/20 text-purple-300 ring-purple-500/30",
      },
      WORKSPACE_MEMBER: {
        text: "Member",
        class: "bg-blue-500/20 text-blue-300 ring-blue-500/30",
      },
    };
    return badges[role] || badges.WORKSPACE_MEMBER;
  };

  const badge = getRoleBadge(workspace.myRole);

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-left transition hover:border-indigo-500/50 hover:bg-slate-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      {/* Hover Gradient Effect */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
      </div>

      <div className="relative">
        {/* Avatar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-lg">
            {workspace.avatarUrl ? (
              <img
                src={workspace.avatarUrl}
                alt={workspace.name}
                className="h-full w-full rounded-xl object-cover"
              />
            ) : (
              workspace.name.charAt(0).toUpperCase()
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${badge.class}`}
          >
            {badge.text}
          </span>
        </div>

        {/* Workspace Info */}
        <h3 className="mb-2 text-xl font-semibold text-white transition group-hover:text-indigo-300">
          {workspace.name}
        </h3>

        {workspace.description && (
          <p className="mb-4 line-clamp-2 text-sm text-slate-400">
            {workspace.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span>{workspace.memberCount} members</span>
          </div>
        </div>

        {/* Arrow Icon */}
        <div className="absolute right-6 top-6 text-slate-600 transition group-hover:translate-x-1 group-hover:text-indigo-400">
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </button>
  );
}

export default WorkspaceCard;
