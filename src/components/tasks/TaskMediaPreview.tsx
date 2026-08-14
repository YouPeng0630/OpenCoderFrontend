/**
 * Compact media thumbnail for Manager task list.
 * Uses Drive thumbnail / image URLs (not iframe embeds) so the whole
 * frame fits in the small box without Drive chrome cropping.
 */

import { useState, type ReactNode } from "react";
import { FileText, Image as ImageIcon, Music, Video } from "lucide-react";

type MediaBlob = {
  drive_file_id?: string;
  drive_thumbnail_url?: string;
  drive_cdn_url?: string;
  drive_file_url?: string;
  drive_view_url?: string;
  drive_download_url?: string;
  original_filename?: string;
};

type Payload = {
  text?: string | null;
  image?: MediaBlob | null;
  video?: MediaBlob | null;
  audio?: MediaBlob | null;
  pdf?: MediaBlob | null;
};

function driveFileId(media?: MediaBlob | null): string | null {
  if (!media) return null;
  if (media.drive_file_id) return String(media.drive_file_id);
  const url = media.drive_file_url || media.drive_view_url || media.drive_download_url || "";
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m?.[1] || null;
}

function thumbnailCandidates(media?: MediaBlob | null): string[] {
  if (!media) return [];
  const id = driveFileId(media);
  const list: string[] = [];
  if (media.drive_thumbnail_url) list.push(media.drive_thumbnail_url);
  if (media.drive_cdn_url) list.push(media.drive_cdn_url);
  if (id) {
    // Larger sz so object-contain still looks sharp; Google returns full frame
    list.push(`https://drive.google.com/thumbnail?id=${id}&sz=w640`);
    list.push(`https://lh3.googleusercontent.com/d/${id}=w640`);
    list.push(`https://drive.google.com/uc?export=view&id=${id}`);
  }
  if (media.drive_file_url) list.push(media.drive_file_url);
  return [...new Set(list.filter(Boolean))];
}

function Shell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-40 h-24 shrink-0 rounded-md overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center ${className}`}
    >
      {children}
    </div>
  );
}

/** Show full frame inside the box (letterbox, no crop). */
function Thumb({
  candidates,
  alt,
  fallback,
}: {
  candidates: string[];
  alt: string;
  fallback: ReactNode;
}) {
  const [idx, setIdx] = useState(0);
  const src = candidates[idx];

  if (!src) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-contain bg-gray-100"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (idx + 1 < candidates.length) setIdx(idx + 1);
      }}
    />
  );
}

function TextPreview({ text }: { text: string }) {
  return (
    <Shell className="p-2 items-start justify-start">
      <p className="text-[10px] leading-snug text-gray-500 line-clamp-6 whitespace-pre-wrap w-full">
        {text}
      </p>
    </Shell>
  );
}

function AudioPreview({ fileId }: { fileId: string }) {
  return (
    <Shell className="flex-col gap-1 bg-gradient-to-br from-purple-50 to-pink-50">
      <Music className="h-5 w-5 text-purple-400" />
      <audio controls preload="metadata" className="w-[90%] h-7" src={`https://drive.google.com/uc?export=download&id=${fileId}`}>
        <track kind="captions" />
      </audio>
    </Shell>
  );
}

export function TaskMediaPreview({
  taskType,
  payload,
}: {
  taskType?: string;
  payload?: Payload | null;
}) {
  if (!payload) return null;

  const videoId = driveFileId(payload.video);
  const audioId = driveFileId(payload.audio);
  const pdfId = driveFileId(payload.pdf);

  const videoThumb = (
    <Shell>
      <Thumb
        candidates={thumbnailCandidates(payload.video)}
        alt={payload.video?.original_filename || "Video"}
        fallback={<Video className="h-7 w-7 text-gray-300" />}
      />
    </Shell>
  );

  const imageThumb = (
    <Shell>
      <Thumb
        candidates={thumbnailCandidates(payload.image)}
        alt={payload.image?.original_filename || "Image"}
        fallback={<ImageIcon className="h-7 w-7 text-gray-300" />}
      />
    </Shell>
  );

  const pdfThumb = (
    <Shell className="relative">
      <Thumb
        candidates={thumbnailCandidates(payload.pdf)}
        alt={payload.pdf?.original_filename || "PDF"}
        fallback={<FileText className="h-7 w-7 text-slate-300" />}
      />
      <div className="absolute bottom-1 right-1 bg-white/90 rounded px-1 py-0.5 pointer-events-none">
        <FileText className="h-3 w-3 text-slate-500" />
      </div>
    </Shell>
  );

  if (taskType === "video" && (videoId || payload.video)) return videoThumb;
  if (taskType === "image" && payload.image) return imageThumb;
  if (taskType === "audio" && audioId) return <AudioPreview fileId={audioId} />;
  if (taskType === "pdf_document_coding" && (pdfId || payload.pdf)) return pdfThumb;

  if (taskType === "multimodal") {
    if (payload.video) return videoThumb;
    if (payload.image) return imageThumb;
    if (audioId) return <AudioPreview fileId={audioId} />;
    if (payload.pdf) return pdfThumb;
    if (payload.text) return <TextPreview text={payload.text} />;
    return null;
  }

  if (
    (taskType === "text" || taskType === "bibliographic" || taskType === "url") &&
    payload.text
  ) {
    return <TextPreview text={payload.text} />;
  }

  if (payload.video) return videoThumb;
  if (payload.image) return imageThumb;
  if (audioId) return <AudioPreview fileId={audioId} />;
  if (payload.pdf) return pdfThumb;
  if (payload.text) return <TextPreview text={payload.text} />;

  return null;
}
