import { lazy, Suspense } from "react";
import { Outlet, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductPage from "./pages/ProductPage";
import NotFound from "./pages/NotFound";

const CartPage = lazy(() => import("./pages/CartPage"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderPage = lazy(() => import("./pages/OrderPage"));
const Track = lazy(() => import("./pages/Track"));
const Account = lazy(() => import("./pages/Account"));
const CustomOrders = lazy(() => import("./pages/CustomOrders"));
const Story = lazy(() => import("./pages/Story"));
const Contact = lazy(() => import("./pages/Contact"));
const Policy = lazy(() => import("./pages/Policy"));
const Admin = lazy(() => import("./admin/Admin"));

const Loading = () => (
  <div className="grid min-h-dvh place-items-center text-cocoa"><Spinner className="size-8" /></div>
);

const PageLoading = () => <div className="grid min-h-[60vh] place-items-center text-cocoa"><Spinner className="size-8" /></div>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout><Suspense fallback={<PageLoading />}><Outlet /></Suspense></Layout>}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="shop/:category" element={<Shop />} />
        <Route path="product/:slug" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="track" element={<Track />} />
        <Route path="account" element={<Account />} />
        <Route path="custom-orders" element={<CustomOrders />} />
        <Route path="our-story" element={<Story />} />
        <Route path="contact" element={<Contact />} />
        <Route path="policies/:kind" element={<Policy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="checkout" element={<Suspense fallback={<Loading />}><Checkout /></Suspense>} />
      <Route path="order/:number" element={<Suspense fallback={<Loading />}><OrderPage /></Suspense>} />
      <Route path="admin/*" element={<Suspense fallback={<Loading />}><Admin /></Suspense>} />
    </Routes>
  );
}
