'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { sidebarLinks } from '@/constants';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { signOut } from 'next-auth/react';  

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <section className="bg-[#1a1a1a] sticky left-0 top-0 flex h-screen w-fit flex-col justify-between p-6 pt-28 text-white max-sm:hidden lg:w-[264px]">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {sidebarLinks.map((item) => {
          const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`);

          return (
            <Link
              href={item.route}
              key={item.label}
              className={cn(
                'flex items-center justify-start gap-4 rounded-lg p-4',
                {
                  'bg-blue-1': isActive,
                }
              )}
            >
              <Image
                src={item.imgURL}
                alt={item.label}
                width={24}
                height={24}
              />
              <p className="text-lg font-semibold max-lg:hidden">
                {item.label}
              </p>
            </Link>
          );
        })}
      </div>

      <Button
              variant="custom"
              className="text-white h-14 w-full pl-6 flex items-center justify-start gap-4 rounded-2xl"
              onClick={() => signOut({ callbackUrl: '/sign-in' })}
            >

        <Image
                src="/icons/logout.svg"
                alt="Sign out"
                width={28}
                height={28}
              />
              <p className="text-lg font-bold max-lg:hidden">
               Sign out
              </p>
            </Button>
    </section>
  );
}

export default Sidebar;
