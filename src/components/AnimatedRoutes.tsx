import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import GameOfLife from "../pages/GameOfLife";
import AnimatedSphere from "../pages/AnimatedSphere";
import Home from "../pages/Home";

import './AnimatedRoutes.css';

const PAGE_T = 1000; // ms (doit matcher --page-t)

export default function AnimatedRoutes() {
    const location = useLocation();

    // la location réellement affichée (peut "lagger" derrière la location réelle)
    const [displayLocation, setDisplayLocation] = useState(location);

    // état d'animation pour le wrapper
    const [phase, setPhase] = useState("enter"); // "enter" | "exit"

    // pour éviter les timeouts qui se superposent si on clique vite
    const timeoutRef: React.RefObject<number | null> = useRef(null);

    useEffect(() => {
        // Si la route a changé, mais qu'on affiche encore l'ancienne
        if (location.pathname !== displayLocation.pathname) {
            setPhase("exit");

            // annule un éventuel timeout précédent
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            timeoutRef.current = setTimeout(() => {
                // swap du contenu affiché
                setDisplayLocation(location);
                // on remet en "enter" pour animer l'apparition
                setPhase("enter");
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
                <Route path="/animated-sphere" element={<AnimatedSphere />} />
                <Route path="/game-of-life" element={<GameOfLife />} />
            </Routes>
        </div>
    );
}
