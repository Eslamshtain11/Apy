import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';
import { AppDataProvider } from './contexts/AppDataContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppDataProvider>
        <App />
        <Toaster richColors dir="rtl" position="top-center" />
      </AppDataProvider>
    </BrowserRouter>
  </React.StrictMode>
);
