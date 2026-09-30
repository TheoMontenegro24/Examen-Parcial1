import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, saveSession } from "../api";

export default function Auth() {
  const [register, setRegister] = useState(false);
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const nav = useNavigate();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      if (register) await api("/users", { method: "POST", json: f });
      const r = await api("/login", { method: "POST", json: { email: f.email, password: f.password } });
      saveSession(r.access_token, r.user);
      nav("/");
    } catch (err) { setError(err.message); }
  }

  return (
    <form className="panel auth" onSubmit={submit}>
      <h2>{register ? "Crear cuenta" : "Iniciar sesión"}</h2>
      {register && <input placeholder="Nombre" value={f.name} onChange={set("name")} required />}
      <input type="email" placeholder="Correo" value={f.email} onChange={set("email")} required />
      <input type="password" placeholder="Contraseña" value={f.password} onChange={set("password")} required minLength={6} />
      {error && <p className="error">{error}</p>}
      <button>{register ? "Registrarme" : "Entrar"}</button>
      <button type="button" className="link" onClick={() => setRegister(!register)}>
        {register ? "Ya tengo cuenta" : "No tengo cuenta"}
      </button>
    </form>
  );
}
