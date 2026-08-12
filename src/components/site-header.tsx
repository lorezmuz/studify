"use client";

import Link from "next/link";
import { DeviceMobile, House, Plus, Student } from "@phosphor-icons/react";
import { Button } from "./ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-[#f6f8f5]/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm shadow-emerald-900/20">
            <Student weight="bold" className="h-5 w-5" />
          </span>
          <span className="text-base font-bold">Studify</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-emerald-700"
            title="Home"
          >
            <House weight="fill" className="h-5 w-5" />
          </Link>
          <Link
            href="/collega"
            className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-emerald-700"
            title="Collega telefono"
          >
            <DeviceMobile weight="fill" className="h-5 w-5" />
          </Link>
          <Link href="/nuovo">
            <Button size="sm" className="rounded-full bg-emerald-500 hover:bg-emerald-400">
              <Plus weight="bold" className="h-4 w-4" />
              Nuovo
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
