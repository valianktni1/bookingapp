import { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO, isPast } from "date-fns";
import { 
  Receipt,
  Check,
  Clock,
  AlertTriangle,
  Printer,
  Eye
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  sent: { label: "Awaiting Payment", class: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  deposit_paid: { label: "Deposit Paid", class: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  fully_paid: { label: "Fully Paid", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  overdue: { label: "Overdue", class: "bg-red-500/10 text-red-500 border-red-500/20" }
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchSettings();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices`);
      setInvoices(response.data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleMarkDepositPaid = async (invoiceId) => {
    try {
      await axios.put(`${API}/invoices/${invoiceId}`, {
        deposit_paid: true,
        deposit_paid_date: new Date().toISOString().split('T')[0]
      });
      toast.success("Deposit marked as paid");
      fetchInvoices();
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Failed to update invoice");
    }
  };

  const handleMarkBalancePaid = async (invoiceId) => {
    try {
      await axios.put(`${API}/invoices/${invoiceId}`, {
        balance_paid: true,
        balance_paid_date: new Date().toISOString().split('T')[0]
      });
      toast.success("Balance marked as paid");
      fetchInvoices();
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Failed to update invoice");
    }
  };

  const printInvoice = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-obsidian">Invoices</h1>
        <p className="text-muted-foreground mt-1">Track payments and balances</p>
      </div>

      {/* Invoices List */}
      {invoices.length > 0 ? (
        <div className="grid gap-4">
          {invoices.map((invoice, index) => {
            const status = statusConfig[invoice.status] || statusConfig.sent;
            const depositOverdue = !invoice.deposit_paid && isPast(parseISO(invoice.deposit_due_date));
            const balanceOverdue = !invoice.balance_paid && invoice.deposit_paid && isPast(parseISO(invoice.balance_due_date));

            return (
              <Card 
                key={invoice.id}
                className="bg-white border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300"
                data-testid={`invoice-card-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-display text-lg text-obsidian">
                          {invoice.invoice_number}
                        </h3>
                        <Badge className={status.class}>
                          {status.label}
                        </Badge>
                      </div>

                      <p className="text-muted-foreground mb-4">
                        {invoice.partner1_name} & {invoice.partner2_name}
                      </p>

                      {/* Payment Status */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Deposit */}
                        <div className={`p-4 rounded-sm ${invoice.deposit_paid ? 'bg-emerald-50' : depositOverdue ? 'bg-red-50' : 'bg-amber-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground">Deposit</span>
                            {invoice.deposit_paid ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : depositOverdue ? (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-600" />
                            )}
                          </div>
                          <p className="font-display text-lg">£{invoice.deposit_amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {format(parseISO(invoice.deposit_due_date), "dd MMM yyyy")}
                          </p>
                          {!invoice.deposit_paid && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkDepositPaid(invoice.id)}
                              className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-xs"
                              data-testid={`mark-deposit-paid-${index}`}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>

                        {/* Balance */}
                        <div className={`p-4 rounded-sm ${invoice.balance_paid ? 'bg-emerald-50' : balanceOverdue ? 'bg-red-50' : 'bg-muted/50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground">Balance</span>
                            {invoice.balance_paid ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : balanceOverdue ? (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <p className="font-display text-lg">£{invoice.balance_amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {format(parseISO(invoice.balance_due_date), "dd MMM yyyy")}
                          </p>
                          {invoice.deposit_paid && !invoice.balance_paid && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkBalancePaid(invoice.id)}
                              className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-xs"
                              data-testid={`mark-balance-paid-${index}`}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total</p>
                        <p className="font-display text-2xl text-obsidian">
                          £{invoice.total_amount.toLocaleString()}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowViewModal(true);
                        }}
                        data-testid={`view-invoice-${index}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Invoice
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white border-border/40">
          <CardContent className="py-16 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-display text-obsidian mb-2">No invoices yet</p>
            <p className="text-muted-foreground">
              Invoices are created when quotes are accepted
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Invoice Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="no-print">
            <DialogTitle className="font-display text-xl flex items-center justify-between">
              <span>Invoice {selectedInvoice?.invoice_number}</span>
              <Button variant="outline" size="sm" onClick={printInvoice}>
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && settings && (
            <div className="py-4" id="invoice-print">
              {/* Header */}
              <div className="flex justify-between items-start pb-8 border-b border-border">
                <div>
                  <h2 className="font-display text-2xl text-obsidian mb-2">
                    {settings.business_name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{settings.address}</p>
                  <p className="text-sm text-muted-foreground">{settings.phone}</p>
                  <p className="text-sm text-muted-foreground">{settings.email}</p>
                </div>
                <div className="text-right">
                  <h3 className="font-display text-xl text-gold">INVOICE</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedInvoice.invoice_number}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(selectedInvoice.created_at), "dd MMMM yyyy")}
                  </p>
                </div>
              </div>

              {/* Bill To */}
              <div className="py-8 border-b border-border">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Bill To</p>
                <p className="font-display text-lg text-obsidian">
                  {selectedInvoice.partner1_name} & {selectedInvoice.partner2_name}
                </p>
                <p className="text-sm text-muted-foreground">{selectedInvoice.email}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Wedding Date: {format(parseISO(selectedInvoice.wedding_date), "dd MMMM yyyy")}
                </p>
              </div>

              {/* Line Items */}
              <div className="py-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 text-xs uppercase tracking-wider text-muted-foreground">Description</th>
                      <th className="text-right py-3 text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.line_items.map((item, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-4">{item.description}</td>
                        <td className="py-4 text-right">£{item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="py-4 font-display text-lg">Total</td>
                      <td className="py-4 text-right font-display text-xl text-obsidian">
                        £{selectedInvoice.total_amount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Schedule */}
              <div className="py-8 border-t border-border">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Payment Schedule</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-sm">
                    <p className="text-sm text-muted-foreground">Deposit (25%)</p>
                    <p className="font-display text-lg">£{selectedInvoice.deposit_amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {format(parseISO(selectedInvoice.deposit_due_date), "dd MMM yyyy")}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-sm">
                    <p className="text-sm text-muted-foreground">Balance (75%)</p>
                    <p className="font-display text-lg">£{selectedInvoice.balance_amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {format(parseISO(selectedInvoice.balance_due_date), "dd MMM yyyy")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="py-8 border-t border-border">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Bank Transfer Details</p>
                <div className="bg-obsidian text-white p-6 rounded-sm">
                  <p className="mb-2"><strong>Account Name:</strong> {settings.bank_details?.account_name || settings.business_name}</p>
                  <p className="mb-2"><strong>Sort Code:</strong> {settings.bank_details?.sort_code || "Not set"}</p>
                  <p><strong>Account Number:</strong> {settings.bank_details?.account_number || "Not set"}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Please use invoice number {selectedInvoice.invoice_number} as your payment reference.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
