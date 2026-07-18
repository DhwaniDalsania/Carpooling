import React from 'react';

export const Sidebar = ({ label }) => {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-vertical-text">
        {label}
      </div>
    </aside>
  );
};
export default Sidebar;
