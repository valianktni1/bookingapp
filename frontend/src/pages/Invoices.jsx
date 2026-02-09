import { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO, isPast } from "date-fns";
import { 
  Receipt,
  Check,
  Clock,
  AlertTriangle,
  Printer,
  Eye,
  Edit,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Ban
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const openEditModal = (invoice) => {
    setEditingInvoice({
      ...invoice,
      line_items: invoice.line_items.map(item => ({
        ...item,
        id: item.id || Math.random().toString()
      }))
    });
    setShowEditModal(true);
  };

  const updateLineItem = (index, field, value) => {
    const newItems = [...editingInvoice.line_items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === 'description' ? value : parseFloat(value) || 0
    };
    // Recalculate amount
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = (newItems[index].quantity || 1) * (newItems[index].unit_price || 0);
    }
    setEditingInvoice({ ...editingInvoice, line_items: newItems });
  };

  const addLineItem = () => {
    setEditingInvoice({
      ...editingInvoice,
      line_items: [
        ...editingInvoice.line_items,
        { id: Math.random().toString(), description: "", quantity: 1, unit_price: 0, amount: 0 }
      ]
    });
  };

  const removeLineItem = (index) => {
    const newItems = editingInvoice.line_items.filter((_, i) => i !== index);
    setEditingInvoice({ ...editingInvoice, line_items: newItems });
  };

  const calculateEditTotals = () => {
    const subtotal = editingInvoice?.line_items?.reduce((sum, item) => 
      sum + ((item.quantity || 1) * (item.unit_price || 0)), 0) || 0;
    const discount = editingInvoice?.discount || 0;
    const total = subtotal - discount;
    const depositPct = editingInvoice?.deposit_percentage || 25;
    const depositAmount = total * (depositPct / 100);
    const balanceAmount = total - depositAmount;
    return { subtotal, total, depositAmount, balanceAmount };
  };

  const handleSaveInvoice = async () => {
    setSaving(true);
    try {
      const lineItems = editingInvoice.line_items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0
      }));

      await axios.put(`${API}/invoices/${editingInvoice.id}`, {
        line_items: lineItems,
        discount: editingInvoice.discount || 0,
        discount_note: editingInvoice.discount_note,
        deposit_percentage: editingInvoice.deposit_percentage,
        deposit_due_date: editingInvoice.deposit_due_date,
        balance_due_date: editingInvoice.balance_due_date,
        notes: editingInvoice.notes
      });
      
      toast.success("Invoice updated successfully");
      setShowEditModal(false);
      fetchInvoices();
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const printInvoice = () => {
    window.print();
  };

  const editTotals = editingInvoice ? calculateEditTotals() : {};

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
        <p className="text-muted-foreground mt-1">Track payments and edit invoices</p>
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
                            <span className="text-xs uppercase tracking-wider text-muted-foreground">Deposit ({invoice.deposit_percentage || 25}%)</span>
                            {invoice.deposit_paid ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : depositOverdue ? (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-600" />
                            )}
                          </div>
                          <p className="font-display text-lg">£{invoice.deposit_amount?.toLocaleString()}</p>
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
                            <span className="text-xs uppercase tracking-wider text-muted-foreground">Balance ({100 - (invoice.deposit_percentage || 25)}%)</span>
                            {invoice.balance_paid ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : balanceOverdue ? (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <p className="font-display text-lg">£{invoice.balance_amount?.toLocaleString()}</p>
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
                          £{invoice.total_amount?.toLocaleString()}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(invoice)}
                          data-testid={`edit-invoice-${index}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
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
                          View
                        </Button>
                      </div>
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

      {/* Edit Invoice Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Edit Invoice {editingInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>

          {editingInvoice && (
            <div className="py-4 space-y-6">
              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-medium">Line Items</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addLineItem}
                    data-testid="add-line-item-btn"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {editingInvoice.line_items.map((item, index) => (
                    <div key={item.id} className="flex gap-3 items-start p-3 bg-bone rounded-sm">
                      <div className="flex-1">
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          placeholder="Description"
                          data-testid={`line-item-description-${index}`}
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          value={item.quantity || 1}
                          onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          placeholder="Qty"
                          min="1"
                          data-testid={`line-item-qty-${index}`}
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                          placeholder="Price"
                          data-testid={`line-item-price-${index}`}
                        />
                      </div>
                      <div className="w-24 text-right pt-2">
                        <span className="font-medium">£{((item.quantity || 1) * (item.unit_price || 0)).toLocaleString()}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(index)}
                        className="text-red-500 hover:text-red-600"
                        data-testid={`remove-line-item-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Discount (£)</Label>
                  <Input
                    type="number"
                    value={editingInvoice.discount || 0}
                    onChange={(e) => setEditingInvoice({ 
                      ...editingInvoice, 
                      discount: parseFloat(e.target.value) || 0 
                    })}
                    data-testid="edit-discount-input"
                  />
                </div>
                <div>
                  <Label>Discount Note</Label>
                  <Input
                    value={editingInvoice.discount_note || ""}
                    onChange={(e) => setEditingInvoice({ 
                      ...editingInvoice, 
                      discount_note: e.target.value 
                    })}
                    placeholder="e.g., Early booking discount"
                    data-testid="edit-discount-note-input"
                  />
                </div>
              </div>

              {/* Payment Schedule */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Deposit %</Label>
                  <Input
                    type="number"
                    value={editingInvoice.deposit_percentage || 25}
                    onChange={(e) => setEditingInvoice({ 
                      ...editingInvoice, 
                      deposit_percentage: parseInt(e.target.value) || 25 
                    })}
                    min="0"
                    max="100"
                    data-testid="edit-deposit-pct-input"
                  />
                </div>
                <div>
                  <Label>Deposit Due Date</Label>
                  <Input
                    type="date"
                    value={editingInvoice.deposit_due_date}
                    onChange={(e) => setEditingInvoice({ 
                      ...editingInvoice, 
                      deposit_due_date: e.target.value 
                    })}
                    data-testid="edit-deposit-date-input"
                  />
                </div>
                <div>
                  <Label>Balance Due Date</Label>
                  <Input
                    type="date"
                    value={editingInvoice.balance_due_date}
                    onChange={(e) => setEditingInvoice({ 
                      ...editingInvoice, 
                      balance_due_date: e.target.value 
                    })}
                    data-testid="edit-balance-date-input"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editingInvoice.notes || ""}
                  onChange={(e) => setEditingInvoice({ 
                    ...editingInvoice, 
                    notes: e.target.value 
                  })}
                  placeholder="Internal notes..."
                  rows={3}
                  data-testid="edit-notes-input"
                />
              </div>

              {/* Summary */}
              <div className="bg-obsidian text-white p-6 rounded-sm">
                <h4 className="font-display text-lg mb-4">Updated Totals</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>£{editTotals.subtotal?.toLocaleString()}</span>
                  </div>
                  {(editingInvoice.discount || 0) > 0 && (
                    <div className="flex justify-between text-gold">
                      <span>Discount</span>
                      <span>-£{(editingInvoice.discount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/20 pt-2">
                    <span>Total</span>
                    <span className="font-display text-xl">£{editTotals.total?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm opacity-70">
                    <span>Deposit ({editingInvoice.deposit_percentage || 25}%)</span>
                    <span>£{editTotals.depositAmount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm opacity-70">
                    <span>Balance ({100 - (editingInvoice.deposit_percentage || 25)}%)</span>
                    <span>£{editTotals.balanceAmount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveInvoice}
              disabled={saving}
              className="bg-obsidian hover:bg-obsidian/90"
              data-testid="save-invoice-btn"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      <th className="text-center py-3 text-xs uppercase tracking-wider text-muted-foreground w-16">Qty</th>
                      <th className="text-right py-3 text-xs uppercase tracking-wider text-muted-foreground w-24">Price</th>
                      <th className="text-right py-3 text-xs uppercase tracking-wider text-muted-foreground w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.line_items?.map((item, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-4">{item.description}</td>
                        <td className="py-4 text-center">{item.quantity || 1}</td>
                        <td className="py-4 text-right">£{(item.unit_price || item.amount)?.toLocaleString()}</td>
                        <td className="py-4 text-right">£{item.amount?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="py-3 text-right">Subtotal</td>
                      <td className="py-3 text-right">£{selectedInvoice.subtotal?.toLocaleString()}</td>
                    </tr>
                    {(selectedInvoice.discount || 0) > 0 && (
                      <tr>
                        <td colSpan="3" className="py-2 text-right text-gold">
                          Discount {selectedInvoice.discount_note ? `(${selectedInvoice.discount_note})` : ""}
                        </td>
                        <td className="py-2 text-right text-gold">-£{selectedInvoice.discount?.toLocaleString()}</td>
                      </tr>
                    )}
                    <tr className="border-t border-border">
                      <td colSpan="3" className="py-4 font-display text-lg">Total</td>
                      <td className="py-4 text-right font-display text-xl text-obsidian">
                        £{selectedInvoice.total_amount?.toLocaleString()}
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
                    <p className="text-sm text-muted-foreground">Deposit ({selectedInvoice.deposit_percentage || 25}%)</p>
                    <p className="font-display text-lg">£{selectedInvoice.deposit_amount?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {format(parseISO(selectedInvoice.deposit_due_date), "dd MMM yyyy")}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-sm">
                    <p className="text-sm text-muted-foreground">Balance ({100 - (selectedInvoice.deposit_percentage || 25)}%)</p>
                    <p className="font-display text-lg">£{selectedInvoice.balance_amount?.toLocaleString()}</p>
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
