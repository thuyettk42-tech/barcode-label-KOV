import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Sửa lỗi 4: Đè hàm window.print mặc định nếu chạy trong môi trường Electron để gọi chuẩn xác qua IPC
if (typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.print) {
  window.print = () => {
    (window as any).electronAPI.print();
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
