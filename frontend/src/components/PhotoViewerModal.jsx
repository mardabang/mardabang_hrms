import React from "react";

const PhotoViewerModal = ({ photoUrl, altText = "Employee photo", onClose }) => {
  if (!photoUrl) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        cursor: "zoom-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          maxWidth: "90vw",
          maxHeight: "90vh",
          cursor: "default",
        }}
      >
        <img
          src={photoUrl}
          alt={altText}
          style={{
            maxWidth: "50vw",
            maxHeight: "50vh",
            borderRadius: "8px",
            display: "block",
            objectFit: "contain",
          }}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo view"
          style={{
            position: "absolute",
            top: "-16px",
            right: "-16px",
            background: "#dc2626",
            color: "#fff",
            border: "2px solid #fff",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
    </div>
  );
};

export default PhotoViewerModal;