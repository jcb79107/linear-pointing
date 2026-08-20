import { ImageResponse } from "next/og";

export const alt = "Pointed — Pointing poker for Linear";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0b0d12",
          color: "#f7f7f5",
          display: "flex",
          fontFamily: "sans-serif",
          height: "100%",
          padding: "0 92px",
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: 42 }}>
          <svg
            aria-hidden="true"
            fill="none"
            height="168"
            viewBox="0 0 48 48"
            width="168"
          >
            <circle cx="24" cy="24" fill="#5e6ad2" r="5.25" />
            <g
              stroke="#5e6ad2"
              strokeLinecap="round"
              strokeWidth="6.5"
            >
              <path d="M14.5 9.5A18.5 18.5 0 0 1 33.5 9.5" />
              <path
                d="M14.5 9.5A18.5 18.5 0 0 1 33.5 9.5"
                transform="rotate(120 24 24)"
              />
              <path
                d="M14.5 9.5A18.5 18.5 0 0 1 33.5 9.5"
                transform="rotate(240 24 24)"
              />
            </g>
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 104,
                fontWeight: 700,
                letterSpacing: "-0.06em",
                lineHeight: 1,
              }}
            >
              Pointed
            </div>
            <div
              style={{
                color: "#a1a6b3",
                fontSize: 39,
                letterSpacing: "-0.025em",
                marginTop: 25,
              }}
            >
              Pointing poker for Linear
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
