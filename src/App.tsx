import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { RequireRole } from "@/components/RequireRole";
import { useAuth } from "@/store/auth";
import { SearchPage } from "@/pages/SearchPage";
import { CartPage } from "@/pages/CartPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import { WalletPage } from "@/pages/WalletPage";
import { VerifyPage } from "@/pages/VerifyPage";
import { MerchantPage } from "@/pages/merchant/MerchantPage";

function Home() {
  const role = useAuth((s) => s.user?.role);
  return role === "MERCHANT" ? <Navigate to="/merchant" replace /> : <SearchPage />;
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="verify" element={<VerifyPage />} />
        <Route
          path="wallet"
          element={
            <RequireRole>
              <WalletPage />
            </RequireRole>
          }
        />
        <Route
          path="orders"
          element={
            <RequireRole role="CONSUMER">
              <OrdersPage />
            </RequireRole>
          }
        />
        <Route
          path="orders/:orderId"
          element={
            <RequireRole>
              <OrderDetailPage />
            </RequireRole>
          }
        />
        <Route
          path="merchant"
          element={
            <RequireRole role="MERCHANT">
              <MerchantPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
