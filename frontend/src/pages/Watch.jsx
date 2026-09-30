import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, getUser, fmtDate } from "../api";
import VideoCard from "../components/VideoCard";

export default function Watch() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [related, setRelated] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const user = getUser();

  useEffect(() => {
    setVideo(null);
    api(`/videos/${id}`).then(setVideo).catch((e) => setError(e.message));
    api(`/videos/${id}/comments`).then(setComments).catch(() => {});
    api(`/videos?exclude=${id}&limit=6`).then(setRelated).catch(() => {});
  }, [id]);

  async function comment(e) {
    e.preventDefault();
    try {
      const c = await api(`/videos/${id}/comments`, { method: "POST", json: { content: text } });
      setComments([c, ...comments]);
      setText("");
    } catch (err) { setError(err.message); }
  }

  if (error && !video) return <p className="error">{error}</p>;
  if (!video) return <p>Cargando...</p>;

  return (
    <div className="watch">
      <section>
        <video src={video.video_url} controls autoPlay />
        <h2>{video.title}</h2>
        <p className="meta">
          <Link to={`/profile/${video.user.id}`}>{video.user.name}</Link> · {video.views} vistas · {fmtDate(video.created_at)}
        </p>
        <p>{video.description}</p>

        <h3>{comments.length} comentarios</h3>
        {user ? (
          <form className="row" onSubmit={comment}>
            <input placeholder="Escribe un comentario" value={text} onChange={(e) => setText(e.target.value)} required />
            <button>Comentar</button>
          </form>
        ) : <p><Link to="/auth">Inicia sesión</Link> para comentar.</p>}
        {error && <p className="error">{error}</p>}
        {comments.map((c) => (
          <div key={c.id} className="comment">
            <strong>{c.user.name}</strong> <span className="meta">{fmtDate(c.created_at)}</span>
            <p>{c.content}</p>
          </div>
        ))}
      </section>
      <aside>
        <h3>Recomendados</h3>
        {related.map((v) => <VideoCard key={v.id} v={v} compact />)}
      </aside>
    </div>
  );
}
