import { useState } from 'react';

export default function Navbar({ onSearch }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">UNIFY</div>
      <form className="navbar-search" onSubmit={handleSubmit}>
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Search anything..."
          className="search-input"
          autoFocus
        />
        <button type="submit" className="search-btn">Search</button>
      </form>
    </nav>
  );
}
