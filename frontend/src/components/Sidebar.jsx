export default function Sidebar({ categories, selected, onSelect }) {
  return (
    <aside className="sidebar">
      <ul className="category-list">
        {categories.map(cat => (
          <li key={cat.id}>
            <button
              className={`category-btn ${selected === cat.id ? 'active' : ''}`}
              onClick={() => onSelect(cat.id)}
            >
              <span className="cat-icon">{cat.icon}</span>
              <span className="cat-name">{cat.displayName}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
