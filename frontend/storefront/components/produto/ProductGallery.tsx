"use client";

import Image from "next/image";
import { useState } from "react";

export interface GalleryImage {
  src: string;
  alt: string;
}

export function ProductGallery({ imagens }: { imagens: GalleryImage[] }) {
  const [ativa, setAtiva] = useState(0);

  if (imagens.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-brand-sand text-gray-300">
        sem imagem
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-brand-sand">
        <Image
          src={imagens[ativa].src}
          alt={imagens[ativa].alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
          unoptimized
        />
      </div>
      {imagens.length > 1 && (
        <div className="flex gap-2">
          {imagens.map((img, i) => (
            <button
              key={i}
              onClick={() => setAtiva(i)}
              className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 ${
                i === ativa ? "border-brand-sea" : "border-transparent"
              }`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
