import { BrowserRouter } from 'react-router-dom';
import Navigation from './components/Navigation';
import './App.css';
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
