import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Pages
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Jobs from "@/pages/Jobs";
import Quotes from "@/pages/Quotes";
import Invoices from "@/pages/Invoices";
import Contracts from "@/pages/Contracts";
import Settings from "@/pages/Settings";
import ClientPortal from "@/pages/ClientPortal";
import EnquiryForm from "@/pages/EnquiryForm";
import QuoteView from "@/pages/QuoteView";

// Layout
import DashboardLayout from "@/components/DashboardLayout";

function App() {
  return (
    <div className="App min-h-screen bg-bone">
      <BrowserRouter>
        <Routes>
          {/* Admin Routes with Sidebar */}
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Public Routes */}
          <Route path="/portal/:token" element={<ClientPortal />} />
          <Route path="/enquiry" element={<EnquiryForm />} />
          <Route path="/view-quote/:quoteId" element={<QuoteView />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
