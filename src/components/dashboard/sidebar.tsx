"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/instances", label: "Instances" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-muted/40">
      <div className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">ClawMeMaybe</span>
        </Link>
      </div>
      <Separator />
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <Button
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start"
                >
                  {item.label}
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Separator />
      <div className="p-4">
        <Link href="/login">
          <Button variant="outline" className="w-full">
            Sign out
          </Button>
        </Link>
      </div>
    </aside>
  );
}
