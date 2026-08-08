"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { Photo } from "@/lib/types";
import { getPhotoStyle } from "@/lib/photo-style";
import { Tape } from "./Tape";

interface PhotoCardProps {
  photo: Photo;
  index: number;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function PhotoCard({ photo, index }: PhotoCardProps) {
  const { rotation, tapeColor, doubleTaped } = getPhotoStyle(photo.id);
  const width = photo.width ?? 1200;
  const height = photo.height ?? 900;

  return (
    <motion.figure
      initial={{ opacity: 0, y: 22, scale: 0.94, rotate: rotation }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: rotation }}
      whileHover={{ rotate: 0, scale: 1.045, zIndex: 20 }}
      transition={{
        opacity: { duration: 0.5, delay: Math.min(index * 0.04, 0.5) },
        y: { duration: 0.5, delay: Math.min(index * 0.04, 0.5), ease: [0.22, 1, 0.36, 1] },
        scale: { type: "spring", stiffness: 300, damping: 22 },
        rotate: { type: "spring", stiffness: 260, damping: 20 },
      }}
      className="group relative mb-6 break-inside-avoid-column"
    >
      <div className="relative rounded-sm bg-[#fffdf8] p-3 pb-4 shadow-[0_10px_20px_-8px_rgba(51,64,77,0.35)] transition-shadow duration-300 group-hover:shadow-[0_18px_30px_-10px_rgba(51,64,77,0.45)]">
        <Tape
          color={tapeColor}
          rotate={rotation > 0 ? -8 : 8}
          className="-top-3 left-1/2 -translate-x-1/2"
        />
        {doubleTaped && (
          <Tape
            color={tapeColor}
            rotate={rotation > 0 ? 10 : -10}
            className="-bottom-3 right-4"
          />
        )}

        <div className="overflow-hidden bg-ink/5">
          <Image
            src={photo.src}
            alt={photo.caption || photo.name}
            width={width}
            height={height}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 320px"
            className="h-auto w-full"
            loading={index < 6 ? undefined : "lazy"}
            priority={index < 3}
          />
        </div>

        {photo.caption && (
          <figcaption className="mt-2 px-1 font-display text-xl leading-snug text-ink">
            {photo.caption}
          </figcaption>
        )}
        <p className="mt-1 px-1 font-typewriter text-[10px] tracking-wide text-ink/50">
          {DATE_FORMATTER.format(new Date(photo.createdTime))}
        </p>
      </div>
    </motion.figure>
  );
}
