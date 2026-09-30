import { HashRouter, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { getUser, clearSession } from "./api";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Watch from "./pages/Watch";
import Profile from "./pages/Profile";

function Navbar() {
  const user = getUser();
  const nav = useNavigate();
  return (
    <header className="nav">
      <Link to="/" className="brand">VideoSpa</Link>
      <nav>
        {user ? (
          <>
            <Link to="/profile">{user.name}</Link>
            <button className="link" onClick={() => { clearSession(); nav("/auth"); }}>Cerrar sesión</button>
          </>
        ) : (
          <Link to="/auth">Iniciar sesión</Link>
        )}
      </nav>
    </header>
  );
}

const Private = ({ children }) => (getUser() ? children : <Navigate to="/auth" />);

export default function App() {
  return (
    <HashRouter>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/profile/:id?" element={<Private><Profile /></Private>} />
        </Routes>
      </main>
    </HashRouter>
  );
}
