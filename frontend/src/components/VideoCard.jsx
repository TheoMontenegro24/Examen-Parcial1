import { Link } from "react-router-dom";
import { fmtDate } from "../api";

export default function VideoCard({ v, compact }) {
  return (
    <Link to={`/watch/${v.id}`} className={compact ? "card compact" : "card"}>
      <img src={v.thumbnail_url} alt={v.title} />
      <div className="info">
        <h3>{v.title}</h3>
        <p>{v.user.name}</p>
        <p>{v.views} vistas · {fmtDate(v.created_at)}</p>
      </div>
    </Link>
  );
}
