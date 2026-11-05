import { BrowserRouter, Route, Routes } from 'react-router';
import { ProfilePage } from './pages/ProfilePage';
export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProfilePage />} />
        <Route
          path="*"
          element={
            <main>
              <h1>Страница не найдена</h1>
              <a href="/">На главную</a>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
