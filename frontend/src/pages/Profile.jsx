import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, getUser } from "../api";
import VideoCard from "../components/VideoCard";

export default function Profile() {
  const me = getUser();
  const { id } = useParams();
  const userId = id || me.id;
  const own = Number(userId) === me.id;
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null); // {id,title,description}

  const load = () => api(`/users/${userId}`).then(setProfile).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [userId]);

  async function publish(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/videos", { method: "POST", form: new FormData(e.target) });
      e.target.reset();
      await load();
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      await api(`/videos/${edit.id}`, { method: "PUT", json: { title: edit.title, description: edit.description } });
      setEdit(null); load();
    } catch (err) { setError(err.message); }
  }

  async function remove(v) {
    if (!confirm(`¿Eliminar "${v.title}"?`)) return;
    try { await api(`/videos/${v.id}`, { method: "DELETE" }); load(); }
    catch (err) { setError(err.message); }
  }

  if (!profile) return <p>{error || "Cargando..."}</p>;

  return (
    <div>
      <div className="panel">
        <h2>{profile.name}</h2>
        {own && <p>{profile.email}</p>}
        <p>{profile.video_count} videos publicados</p>
      </div>
      {error && <p className="error">{error}</p>}

      {own && (
        <form className="panel" onSubmit={publish}>
          <h3>Publicar video</h3>
          <input name="title" placeholder="Título" required />
          <textarea name="description" placeholder="Descripción" rows={3} />
          <label>Video (MP4, máx. 100 MB)<input type="file" name="video" accept="video/mp4" required /></label>
          <label>Miniatura (JPG o PNG)<input type="file" name="thumbnail" accept="image/jpeg,image/png" required /></label>
          <button disabled={busy}>{busy ? "Subiendo..." : "Publicar"}</button>
        </form>
      )}

      <h3>Videos</h3>
      <div className="grid">
        {profile.videos.map((v) => (
          <div key={v.id}>
            <VideoCard v={v} />
            {own && (edit?.id === v.id ? (
              <form className="panel" onSubmit={saveEdit}>
                <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required />
                <textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} rows={2} />
                <div className="row"><button>Guardar</button><button type="button" className="link" onClick={() => setEdit(null)}>Cancelar</button></div>
              </form>
            ) : (
              <div className="row">
                <button className="link" onClick={() => setEdit({ id: v.id, title: v.title, description: v.description || "" })}>Editar</button>
                <button className="link danger" onClick={() => remove(v)}>Eliminar</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
