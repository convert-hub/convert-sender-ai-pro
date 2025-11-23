import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DispatchProvider } from "@/contexts/DispatchContext";
import Home from "./pages/Home";
import Import from "./pages/Import";
import Map from "./pages/Map";
import Batches from "./pages/Batches";
import Campaigns from "./pages/Campaigns";
import History from "./pages/History";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DispatchProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/import" element={<Import />} />
          <Route path="/map" element={<Map />} />
          <Route path="/batches" element={<Batches />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DispatchProvider>
  </QueryClientProvider>
);

export default App;
