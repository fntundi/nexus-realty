import React from 'react';

export default function Layout({ children, currentPageName }) {
  return (
    <>
      <style>{`
        :root {
          --gold: #D4AF37;
          --gold-dark: #B8860B;
          --silver: #E8E8E8;
          --silver-dark: #A9A9A9;
          --black: #1A1A1A;
          --black-light: #2D2D2D;
          --white: #FAFAF9;
          --accent-gold: #F4D03F;
        }

        * {
          color-scheme: dark light;
        }

        body {
          background: var(--white);
          color: var(--black);
        }

        /* Premium button styles */
        button {
          transition: all 0.3s ease;
        }

        /* Gold accents for primary actions */
        .bg-primary, .bg-blue-600, .bg-blue-700 {
          background-color: var(--gold) !important;
          color: var(--black) !important;
        }

        .bg-primary:hover, .bg-blue-600:hover, .bg-blue-700:hover {
          background-color: var(--gold-dark) !important;
          box-shadow: 0 8px 16px rgba(212, 175, 55, 0.3);
        }

        /* Silver accents */
        .border-silver {
          border-color: var(--silver-dark);
        }

        /* Premium card styles */
        .card, [class*="Card"] {
          border-color: var(--silver);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
        }

        .card:hover, [class*="Card"]:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          border-color: var(--gold);
        }

        /* Premium typography */
        h1, h2, h3, h4, h5, h6 {
          color: var(--black);
          font-weight: 600;
          letter-spacing: -0.5px;
        }

        /* Luxury badge styling */
        [class*="Badge"] {
          background: linear-gradient(135deg, var(--gold) 0%, var(--accent-gold) 100%);
          color: var(--black);
          border: none;
        }

        /* Premium tabs */
        [role="tablist"] {
          border-bottom: 2px solid var(--silver);
        }

        [role="tab"][aria-selected="true"] {
          color: var(--gold);
          border-bottom: 3px solid var(--gold);
        }

        [role="tab"]:hover {
          color: var(--gold-dark);
        }

        /* Smooth transitions */
        * {
          transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }
      `}</style>
      <div className="min-h-screen bg-white">
        {children}
      </div>
    </>
  );
}