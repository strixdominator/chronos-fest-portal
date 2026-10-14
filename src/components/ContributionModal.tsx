'use client';

import React from 'react';
import { X, Heart, Sparkles, ExternalLink } from 'lucide-react';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContributionModal({ isOpen, onClose }: ContributionModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="no-print"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 16, 30, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 9999,
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '2px solid var(--color-gold, #F5B82E)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(245, 184, 46, 0.25)',
          maxWidth: 480,
          width: '100%',
          padding: '36px 28px 28px',
          textAlign: 'center',
          position: 'relative',
          animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top-Right Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close contribution dialog"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--bg-page, #F3F4F6)',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-navy, #0A192F)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FEE2E2';
            e.currentTarget.style.color = '#DC2626';
            e.currentTarget.style.borderColor = '#FCA5A5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#F3F4F6';
            e.currentTarget.style.color = '#0A192F';
            e.currentTarget.style.borderColor = '#E5E7EB';
          }}
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Decorative Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF3C7', color: '#92400E', padding: '6px 14px', borderRadius: 20, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 16, textTransform: 'uppercase' }}>
          <Sparkles size={14} color="#D97706" />
          DBIT ALUMNI GIVING
        </div>

        {/* Quote as Requested by User */}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.65rem',
            fontWeight: 800,
            lineHeight: 1.25,
            color: 'var(--color-navy, #0A192F)',
            letterSpacing: '-0.02em',
            margin: '0 0 14px',
          }}
        >
          &ldquo;A Little Contribution, A Lasting Legacy,&rdquo;
        </h2>

        {/* Supporting description */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.92rem',
            lineHeight: 1.55,
            color: '#4B5563',
            margin: '0 0 24px',
            padding: '0 8px',
          }}
        >
          Join fellow alumni in empowering DBIT students, supporting merit scholarships, and upgrading campus technical infrastructure for the next generation of engineers.
        </p>

        {/* Vibrant Contribute Button */}
        <a
          href="https://alumni.dbit.co.in/funds.dz"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #FFB800 0%, #FF8A00 50%, #E66A00 100%)',
            color: '#07152B',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.95rem',
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            textDecoration: 'none',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(255, 138, 0, 0.45)',
            transition: 'all 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 30px rgba(255, 138, 0, 0.6)';
            e.currentTarget.style.filter = 'brightness(1.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 138, 0, 0.45)';
            e.currentTarget.style.filter = 'none';
          }}
        >
          <Heart size={18} fill="#07152B" />
          CONTRIBUTE NOW ↗
        </a>

        {/* Secondary dismiss */}
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 14,
            background: 'none',
            border: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: '#6B7280',
            cursor: 'pointer',
            padding: '8px 12px',
            textDecoration: 'underline',
          }}
        >
          Continue to View My Entry Pass
        </button>
      </div>

      <style jsx global>{`
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
