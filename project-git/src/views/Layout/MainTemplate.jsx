/**
 * MainTemplate — основной layout приложения
 * @description Обёртка, включает Sidebar, Header и children
 */

import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const MainTemplate = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainTemplate;
