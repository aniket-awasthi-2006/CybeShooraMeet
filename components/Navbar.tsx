'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

import MobileNav from './MobileNav';
import { Button } from './ui/button';

const Navbar = () => {
  const { data: session } = useSession();
  const avatarSrc = session?.user?.image || '/icons/Logodark.svg';
  const userLabel = session?.user?.name || session?.user?.email || 'Sign in';

  return (
    <nav className="flex-between fixed z-50 w-full bg-[#151515] px-8 py-5 lg:px-10">
      <Link href="/" className="flex items-center gap-1">
        <Image
          src="/icons/Logodark.svg"
          width={32}
          height={32}
          alt="CyberShoora Meet logo"
          className="max-sm:size-10"
        />
        <p className="text-[26px] font-extrabold text-white max-sm:hidden">
          CyberShoora Meet
        </p>
      </Link>
      <div className="flex-between gap-5">
        {session ? (
            <Image
              src={avatarSrc}
              width={36}
              height={36}
              alt="user avatar"
              className="rounded-full border border-dark-4"
            />
        ) : (
          <Button asChild className="bg-blue-1 text-white hover:bg-blue-1/80">
            <Link href="/sign-in">{userLabel}</Link>
          </Button>
        )}

        <MobileNav />
      </div>
    </nav>
  );
};

export default Navbar;
