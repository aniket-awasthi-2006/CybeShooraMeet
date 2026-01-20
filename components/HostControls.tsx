'use client';

import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { Shield } from 'lucide-react';

const HostControls = () => {
  const call = useCall();
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant();

  if (!call)
    throw new Error('useStreamCall must be used within a StreamCall component.');

  const isMeetingOwner =
    localParticipant &&
    call.state.createdBy &&
    localParticipant.userId === call.state.createdBy.id;

  if (!isMeetingOwner) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl bg-dark-3/70 px-3 py-2 text-white shadow">
      <Shield size={16} />
      <span className="text-xs text-gray-200">
        Host controls are enabled for you. Force mute/uncam uses Stream permissions
        and is handled in the call UI.
      </span>
    </div>
  );
};

export default HostControls;
