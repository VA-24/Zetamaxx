'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="mb-8">
      <nav className="flex justify-between items-center py-4">
        <Link href="/" className="text-2xl font-bold text-[#4a90e2]">
          ZetaMaxx
        </Link>
        <div className="space-x-4">
          <Link href="/login" className={pathname === '/login' ? 'text-[#4a90e2]' : ''}>
            Login
          </Link>
          <Link href="/register" className={pathname === '/register' ? 'text-[#4a90e2]' : ''}>
            Register
          </Link>
        </div>
      </nav>
    </header>
  );
}