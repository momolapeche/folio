import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import AnimatedSphere from './pages/AnimatedSphere.tsx';
import GameOfLife from './pages/GameOfLife';
import './App.css';
import { useEffect, useState } from 'react';
import AnimatedRoutes from './components/AnimatedRoutes.tsx';

function App() {

	return (
		<BrowserRouter>
			<Navigation />
			<AnimatedRoutes />
		</BrowserRouter>
	);
}

export default App;
