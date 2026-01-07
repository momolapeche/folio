import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import GameOfLife from "../pages/GameOfLife";
import RubiksCube from "../pages/RubiksCube";
import Home from "../pages/Home";

import './AnimatedRoutes.css';

const PAGE_T = 200

export default function AnimatedRoutes() {
    const location = useLocation();

    const [displayLocation, setDisplayLocation] = useState(location);

    const [phase, setPhase] = useState<"enter" | "exit">("enter");

    const timeoutRef: React.RefObject<number | null> = useRef(null);

    useEffect(() => {
        if (location.pathname !== displayLocation.pathname) {
            setPhase("exit")

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }

            timeoutRef.current = setTimeout(() => {
                setDisplayLocation(location)
                setPhase("enter")
            }, PAGE_T);
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [location, displayLocation]);

    return (
        <div className={`page-transition ${phase === "enter" ? "fade-in" : "fade-out"}`}>
            <Routes location={displayLocation}>
                <Route path="/" element={<Home />} />
                <Route path="/rubiks-cube" element={<RubiksCube />} />
                <Route path="/game-of-life" element={<GameOfLife />} />
            </Routes>
        </div>
    );
}
