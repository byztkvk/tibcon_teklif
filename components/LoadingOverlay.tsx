"use client";

import React from 'react';

const LoadingOverlay = ({ message }: { message: string | null }) => {
    if (!message) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, transition: 'opacity 0.3s ease'
        }}>
            <div style={{
                background: 'white', padding: '2.5rem 3.5rem', borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.1)',
                border: '1px solid rgba(255,255,255,0.8)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem',
                maxWidth: '90%', textAlign: 'center'
            }}>
                <div className="tibcon-spinner" style={{
                    width: '60px', height: '60px', border: '6px solid #f3f3f3',
                    borderTop: '6px solid var(--tibcon-red)', borderRadius: '50%',
                    animation: 'tibcon-spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                }} />
                <div style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 800,
                    fontSize: '1.3rem',
                    color: '#1e293b',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2
                }}>
                    {message}
                </div>
                <div style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.95rem',
                    color: '#64748b',
                    fontWeight: 500
                }}>
                    İşleminiz güvenle yapılıyor, lütfen bekleyiniz...
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes tibcon-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}} />
        </div>
    );
};

export default LoadingOverlay;
