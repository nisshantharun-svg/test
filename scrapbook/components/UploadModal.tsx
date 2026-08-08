"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { prepareImageForUpload } from "@/lib/image-compression";
import type { Photo } from "@/lib/types";

interface UploadModalProps {
  onClose: () => void;
  onUploaded: (photo: Photo) => void;
}

type Status = "idle" | "preparing" | "uploading" | "error";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

function isAcceptableFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/")) return true;
  // HEIC files sometimes arrive with an empty MIME type.
  return /\.hei[cf]$/i.test(file.name);
}

export function UploadModal({ onClose, onUploaded }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const selectFile = useCallback((file: File) => {
    if (!isAcceptableFile(file)) {
      setStatus("error");
      setErrorMessage("That doesn't look like a photo. Please choose a JPG, PNG, WebP, or HEIC file.");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) selectFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) selectFile(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedFile || status === "preparing" || status === "uploading") return;

    setErrorMessage(null);
    try {
      setStatus("preparing");
      const { blob, filename } = await prepareImageForUpload(selectedFile);

      setStatus("uploading");
      const formData = new FormData();
      formData.append("file", blob, filename);
      if (caption.trim()) formData.append("caption", caption.trim());

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "The upload didn't go through.");
      }

      const { photo } = (await response.json()) as { photo: Photo };
      onUploaded(photo);
      onClose();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  const isBusy = status === "preparing" || status === "uploading";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative w-full max-w-sm rounded-sm bg-[#fffdf8] p-6 shadow-[0_24px_60px_-12px_rgba(51,64,77,0.5)] sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1 text-ink/50 hover:bg-ink/5 hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="upload-modal-title" className="font-display text-3xl text-ink">
          Add a memory
        </h2>
        <p className="mt-1 text-sm text-ink/60">It&apos;ll be pasted right in for everyone to see.</p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
            }}
            className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed px-4 py-6 text-center transition-colors ${
              isDraggingOver ? "border-rose bg-rose/5" : "border-ink/25 hover:border-ink/40"
            }`}
          >
            {previewUrl ? (
              <div className="relative h-32 w-full overflow-hidden rounded-sm">
                <Image src={previewUrl} alt="Selected preview" fill className="object-contain" unoptimized />
              </div>
            ) : (
              <>
                <ImagePlus className="h-8 w-8 text-ink/40" />
                <p className="text-sm text-ink/60">
                  Drop a photo here, or <span className="text-rose underline">browse</span>
                </p>
                <p className="text-xs text-ink/40">JPG, PNG, WebP, or HEIC</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          <div>
            <label htmlFor="caption" className="mb-1 block font-typewriter text-[11px] uppercase tracking-wide text-ink/50">
              Caption (optional)
            </label>
            <input
              id="caption"
              type="text"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={280}
              placeholder="Say something about this one..."
              className="w-full border-b-2 border-ink/20 bg-transparent px-1 py-1.5 font-display text-xl text-ink placeholder:text-ink/30 focus:border-rose focus:outline-none"
            />
          </div>

          {status === "error" && errorMessage && (
            <p className="rounded-sm bg-rose/10 px-3 py-2 text-sm text-ink">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={!selectedFile || isBusy}
            className="mt-1 flex items-center justify-center gap-2 rounded-sm bg-gold px-4 py-3 font-display text-xl text-[#fffdf8] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isBusy && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === "preparing" && "Preparing photo..."}
            {status === "uploading" && "Pasting it in..."}
            {(status === "idle" || status === "error") && "Paste it in"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
