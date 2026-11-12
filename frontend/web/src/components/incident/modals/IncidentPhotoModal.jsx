import React from 'react';

export default function IncidentPhotoModal({ photoUrl, onClose }) {
  if (!photoUrl) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-black">
        <img src={photoUrl} alt="Full view" className="max-w-full max-h-[85vh] object-contain" />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2 hover:bg-black transition cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
