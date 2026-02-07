"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "./Navbar";

interface AuthGateProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export default function AuthGate({ children, allowedRoles }: AuthGateProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [checked, setChecked] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // 1. Session Check
        const sessionRaw = typeof window !== "undefined" ? localStorage.getItem("tibcon_session") : null;
        let session = null;
        try {
            session = sessionRaw ? JSON.parse(sessionRaw) : null;
        } catch (e) {
            console.error("Session parse error", e);
        }

        const hasSession = !!session;
        setIsLoggedIn(hasSession);

        // 2. Define Public Paths
        const isPublicPath =
            pathname === "/login" ||
            pathname.startsWith("/api") ||
            pathname.startsWith("/_next") ||
            pathname === "/favicon.ico";

        // 3. Logic
        if (pathname === "/login" && hasSession) {
            // Logged in user trying to access login -> Home
            router.replace("/");
            return;
        }

        if (!isPublicPath && !hasSession) {
            // Not logged in user trying to access protected -> Login
            router.replace("/login");
            return;
        }

        // 4. Role Check (only if logged in and not public)
        if (hasSession && !isPublicPath) {
            if (allowedRoles && !allowedRoles.includes(session.role)) {
                // User has session but wrong role -> Home
                router.replace("/");
                return;
            }
        }
        // If we are here, we are good.
        setIsAuthorized(true);
        setChecked(true);

    }, [pathname, router, allowedRoles]);

    // Don't render anything until checks are complete
    if (!checked) return null;

    // Additional safeguard for render logic
    const isPublic =
        pathname === "/login" ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/_next") ||
        pathname === "/favicon.ico";

    // If we are supposed to redirect, don't show content
    if (pathname === "/login" && isLoggedIn) return null;
    if (!isPublic && !isLoggedIn) return null;
    if (!isAuthorized && !isPublic) return null;

    return (
        <>
            {isLoggedIn && pathname !== "/login" && <Navbar />}
            {children}
        </>
    );
}
