import { useEffect, useState } from "react";
import { api } from "../api";
import VideoCard from "../components/VideoCard";

export default function Home() {
  const [videos, setVideos] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("/videos").then(setVideos).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="error">{error}</p>;
  if (!videos) return <p>Cargando videos...</p>;
  if (!videos.length) return <p>Aún no hay videos. Inicia sesión y publica el primero desde tu perfil.</p>;
  return <div className="grid">{videos.map((v) => <VideoCard key={v.id} v={v} />)}</div>;
}
