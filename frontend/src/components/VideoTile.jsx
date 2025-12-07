import { useEffect, useRef } from "react";

function VideoTile({ participant, isLocal = false, isScreenShare = false }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!participant) return;

    console.log("VideoTile participant:", participant, "isScreenShare:", isScreenShare);
    console.log("VideoTile tracks detail:", {
      videoTrack: participant.tracks?.video,
      screenVideoTrack: participant.tracks?.screenVideo,
      allTracks: participant.tracks
    });

    // Get video track from Daily.co participant object
    // For screen share, use screenVideo track instead of regular video
    let videoTrack;
    if (isScreenShare) {
      videoTrack = participant.tracks?.screenVideo?.persistentTrack ||
                   participant.tracks?.screenVideo?.track ||
                   participant.screenVideoTrack;
    } else {
      videoTrack = participant.tracks?.video?.persistentTrack ||
                   participant.tracks?.video?.track ||
                   participant.videoTrack;
    }

    const audioTrack = participant.tracks?.audio?.persistentTrack ||
                       participant.tracks?.audio?.track ||
                       participant.audioTrack;

    console.log("Video track selected:", videoTrack, "Audio track:", audioTrack, "isScreenShare:", isScreenShare);

    // Set video track
    if (videoTrack && videoRef.current) {
      const videoEl = videoRef.current;

      // Only update if the track is different
      const currentTrack = videoEl.srcObject?.getVideoTracks()[0];
      if (currentTrack?.id !== videoTrack.id) {
        const newStream = new MediaStream([videoTrack]);
        videoEl.srcObject = newStream;
        // Use a small delay to avoid "interrupted by load" error
        setTimeout(() => {
          videoEl.play().catch(err => {
            if (!err.message.includes("interrupted")) {
              console.error("Video play error:", err);
            }
          });
        }, 100);
      }
    } else if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }

    // Set audio track (but not for local participant to avoid echo)
    if (!isLocal && audioTrack && audioRef.current) {
      const audioEl = audioRef.current;

      // Only update if the track is different
      const currentTrack = audioEl.srcObject?.getAudioTracks()[0];
      if (currentTrack?.id !== audioTrack.id) {
        const newStream = new MediaStream([audioTrack]);
        audioEl.srcObject = newStream;
        audioEl.play().catch(err => console.error("Audio play error:", err));
      }
    } else if (!isLocal && audioRef.current && audioRef.current.srcObject) {
      audioRef.current.srcObject = null;
    }
  }, [participant, isLocal]);

  const displayName = participant?.user_name || participant?.user_id || "Unknown";
  // For screen share, check screenVideo track, otherwise check regular video
  const hasVideo = isScreenShare
    ? (participant?.screen || participant?.tracks?.screenVideo?.state === 'playable')
    : participant?.video;
  const hasAudio = participant?.audio;

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
      {/* Video element */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        // Avatar placeholder when video is off
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="text-white text-sm font-medium">{displayName}</p>
        </div>
      )}

      {/* Audio element (hidden) */}
      {!isLocal && <audio ref={audioRef} autoPlay />}

      {/* Participant info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium">
              {displayName} {isLocal && "(You)"}
            </span>
            {isScreenShare && (
              <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">
                Presenting
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Mic indicator */}
            {!hasAudio && (
              <div className="bg-red-600 p-1 rounded">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Local indicator */}
      {isLocal && (
        <div className="absolute top-3 left-3 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium">
          You
        </div>
      )}
    </div>
  );
}

export default VideoTile;
