import VideoTile from "./VideoTile";

function VideoGrid({ participants, localParticipant, screenShare }) {
  // If someone is screen sharing, show screen share prominently
  if (screenShare) {
    // Check if the screen share is from the local participant
    const isLocalScreenShare = screenShare.local ||
                                screenShare.session_id === localParticipant?.session_id;

    return (
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Main area - screen share */}
        <div className="flex-1 flex items-center justify-center">
          <VideoTile participant={screenShare} isScreenShare={true} isLocal={isLocalScreenShare} />
        </div>

        {/* Sidebar with participants */}
        <div className="w-64 flex flex-col gap-3 overflow-y-auto">
          {/* Local participant - only show if NOT screen sharing */}
          {localParticipant && !isLocalScreenShare && (
            <VideoTile participant={localParticipant} isLocal={true} />
          )}

          {/* Remote participants */}
          {Object.values(participants).map((participant) => (
            <VideoTile key={participant.session_id} participant={participant} />
          ))}
        </div>
      </div>
    );
  }

  // Regular grid layout
  const allParticipants = [
    localParticipant && { ...localParticipant, isLocal: true },
    ...Object.values(participants),
  ].filter(Boolean);

  const participantCount = allParticipants.length;

  // Determine grid layout based on participant count
  let gridClass = "grid gap-4 p-4 h-full";
  if (participantCount === 1) {
    gridClass += " grid-cols-1";
  } else if (participantCount === 2) {
    gridClass += " grid-cols-2";
  } else if (participantCount <= 4) {
    gridClass += " grid-cols-2 grid-rows-2";
  } else if (participantCount <= 6) {
    gridClass += " grid-cols-3 grid-rows-2";
  } else if (participantCount <= 9) {
    gridClass += " grid-cols-3 grid-rows-3";
  } else {
    gridClass += " grid-cols-4 auto-rows-fr overflow-y-auto";
  }

  return (
    <div className={gridClass}>
      {allParticipants.map((participant, index) => (
        <VideoTile
          key={participant.session_id || `local-${index}`}
          participant={participant}
          isLocal={participant.isLocal}
        />
      ))}
    </div>
  );
}

export default VideoGrid;
