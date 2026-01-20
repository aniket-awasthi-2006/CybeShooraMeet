'use client';

import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';

import { Button } from './ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const EndCallButton = () => {
  const call = useCall();
  const router = useRouter();

  if (!call)
    throw new Error(
      'useStreamCall must be used within a StreamCall component.',
    );

  // https://getstream.io/video/docs/react/guides/call-and-participant-state/#participant-state-3
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant();

  const isMeetingOwner =
    localParticipant &&
    call.state.createdBy &&
    localParticipant.userId === call.state.createdBy.id;

  if (!isMeetingOwner) return null;

  const endCall = async () => {
    await call.endCall();
    router.push('/');
  };

  return (
    <Button onClick={endCall} 
    variant="custom"
    className="flex h-11 px-4 gap-1 items-center justify-center rounded-full bg-red-600 text-white shadow-lg ring-1 ring-red-700/50 transition hover:bg-red-700"
               >
                 
                   <Image
                    src="/icons/endmeet.svg"
                    alt="End Meeting"
                    width={30}
                    height={30}
                  />
                   <Image
                    src="/icons/hangup.svg"
                    alt="End Meeting"
                    width={20}
                    height={20} 
                    
                  />
    </Button>
  );
};

export default EndCallButton;
