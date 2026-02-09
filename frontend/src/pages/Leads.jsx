import { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO } from "date-fns";
import { 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Calendar,
  MoreVertical,
  Send,
  Trash2,
  Package,
  Sparkles,
  Check,
  Minus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  new: { label: "New", class: "bg-sage/10 text-sage border-sage/20" },
  contacted: { label: "Contacted", class: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  quote_sent: { label: "Quote Sent", class: "bg-gold/10 text-gold border-gold/20" },
  booked: { label: "Booked", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  lost: { label: "Lost", class: "bg-red-500/10 text-red-500 border-red-500/20" }
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  
  // Packages & Add-ons
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);
  
  // Quote Builder State
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState({});
  const [addonQuantities, setAddonQuantities] = useState({});
  const [quoteDiscount, setQuoteDiscount] = useState(0);
  const [discountNote, setDiscountNote] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  
  const [formData, setFormData] = useState({
    partner1_name: "",
    partner2_name: "",
    email: "",
    phone: "",
    wedding_date: "",
    venue: "",
    message: ""
  });

  useEffect(() => {
    fetchLeads();
    fetchPackages();
  }, [statusFilter]);

  const fetchLeads = async () => {
    try {
      const url = statusFilter === "all" 
        ? `${API}/leads` 
        : `${API}/leads?status=${statusFilter}`;
      const response = await axios.get(url);
      setLeads(response.data);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API}/packages`);
      const all = response.data;
      setPackages(all.filter(p => p.package_type === "main"));
      setAddons(all.filter(p => p.package_type === "addon"));
    } catch (error) {
      console.error("Error fetching packages:", error);
    }
  };

  const handleAddLead = async () => {
    try {
      await axios.post(`${API}/leads`, formData);
      toast.success("Lead added successfully");
      setShowAddModal(false);
      setFormData({
        partner1_name: "",
        partner2_name: "",
        email: "",
        phone: "",
        wedding_date: "",
        venue: "",
        message: ""
      });
      fetchLeads();
    } catch (error) {
      console.error("Error adding lead:", error);
      toast.error("Failed to add lead");
    }
  };

  const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      await axios.put(`${API}/leads/${leadId}`, { status: newStatus });
      toast.success("Status updated");
      fetchLeads();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    try {
      await axios.delete(`${API}/leads/${leadId}`);
      toast.success("Lead deleted");
      fetchLeads();
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead");
    }
  };

  const openQuoteBuilder = async (lead) => {
    setSelectedLead(lead);
    // Auto-select ALL packages and addons so client can choose
    const allPackageIds = packages.filter(p => p.package_type === "main").map(p => p.id);
    const allAddonSelections = {};
    const allAddonQtys = {};
    packages.filter(p => p.package_type === "addon").forEach(p => {
      allAddonSelections[p.id] = true;
      allAddonQtys[p.id] = 1;
    });
    setSelectedPackages(allPackageIds);
    setSelectedAddons(allAddonSelections);
    setAddonQuantities(allAddonQtys);
    setQuoteDiscount(0);
    setDiscountNote("");
    setCustomMessage("");
    setShowQuoteModal(true);
  };

  const togglePackage = (pkgId) => {
    setSelectedPackages(prev => 
      prev.includes(pkgId) 
        ? prev.filter(id => id !== pkgId)
        : [...prev, pkgId]
    );
  };

  const toggleAddon = (addonId) => {
    setSelectedAddons(prev => ({
      ...prev,
      [addonId]: !prev[addonId]
    }));
    if (!addonQuantities[addonId]) {
      setAddonQuantities(prev => ({ ...prev, [addonId]: 1 }));
    }
  };

  const updateAddonQuantity = (addonId, delta) => {
    setAddonQuantities(prev => ({
      ...prev,
      [addonId]: Math.max(1, (prev[addonId] || 1) + delta)
    }));
  };

  const calculateTotal = () => {
    let subtotal = 0;
    
    // Add selected packages
    selectedPackages.forEach(pkgId => {
      const pkg = packages.find(p => p.id === pkgId);
      if (pkg) subtotal += pkg.price;
    });
    
    // Add selected addons with quantities
    Object.keys(selectedAddons).forEach(addonId => {
      if (selectedAddons[addonId]) {
        const addon = addons.find(a => a.id === addonId);
        if (addon) {
          subtotal += addon.price * (addonQuantities[addonId] || 1);
        }
      }
    });
    
    return {
      subtotal,
      discount: quoteDiscount,
      total: subtotal - quoteDiscount
    };
  };

  const handleSendQuote = async (sendEmail = false) => {
    const selectedPkgIds = [...selectedPackages];
    const selectedAddonIds = Object.keys(selectedAddons).filter(id => selectedAddons[id]);
    
    if (selectedPkgIds.length === 0 && selectedAddonIds.length === 0) {
      toast.error("Please select at least one package or add-on");
      return;
    }

    const allIds = [...selectedPkgIds, ...selectedAddonIds];
    const quantities = {};
    selectedAddonIds.forEach(id => {
      quantities[id] = addonQuantities[id] || 1;
    });

    try {
      // Create the quote
      const quoteResponse = await axios.post(`${API}/quotes`, {
        lead_id: selectedLead.id,
        package_ids: allIds,
        quantities,
        discount: quoteDiscount,
        discount_note: discountNote || null,
        custom_message: customMessage || null,
        valid_days: 14
      });
      
      const quoteId = quoteResponse.data.id;
      
      // Send email if requested
      if (sendEmail) {
        try {
          await axios.post(`${API}/quotes/${quoteId}/send-email`);
          toast.success(`Quote created and email sent to ${selectedLead.email}`);
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          toast.warning("Quote created but email failed to send. Check your SMTP settings.");
        }
      } else {
        toast.success("Quote created successfully");
      }
      
      setShowQuoteModal(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (error) {
      console.error("Error sending quote:", error);
      toast.error("Failed to create quote");
    }
  };

  const { subtotal, discount, total } = calculateTotal();

  const filteredLeads = leads.filter(lead => {
    const searchLower = searchTerm.toLowerCase();
    return (
      lead.partner1_name.toLowerCase().includes(searchLower) ||
      lead.partner2_name.toLowerCase().includes(searchLower) ||
      lead.email.toLowerCase().includes(searchLower)
    );
  });

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-obsidian">Leads</h1>
          <p className="text-muted-foreground mt-1">Manage your enquiries</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-obsidian hover:bg-obsidian/90"
          data-testid="add-lead-btn"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-leads-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="quote_sent">Quote Sent</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leads Grid */}
      {filteredLeads.length > 0 ? (
        <div className="grid gap-4">
          {filteredLeads.map((lead, index) => (
            <Card 
              key={lead.id} 
              className="bg-white border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300"
              data-testid={`lead-card-${index}`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display text-lg text-obsidian">
                        {lead.partner1_name} & {lead.partner2_name}
                      </h3>
                      <Badge className={statusConfig[lead.status]?.class || statusConfig.new.class}>
                        {statusConfig[lead.status]?.label || "New"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" /> {lead.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" /> {lead.phone}
                      </span>
                      {lead.wedding_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> {format(parseISO(lead.wedding_date), "dd MMM yyyy")}
                        </span>
                      )}
                    </div>
                    {lead.venue && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Venue: {lead.venue}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.status !== "booked" && lead.status !== "lost" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openQuoteBuilder(lead)}
                        className="border-gold text-gold hover:bg-gold hover:text-white"
                        data-testid={`send-quote-btn-${index}`}
                      >
                        <Send className="w-4 h-4 mr-1" /> Build Quote
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`lead-menu-${index}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUpdateStatus(lead.id, "contacted")}>
                          Mark Contacted
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(lead.id, "lost")}>
                          Mark Lost
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteLead(lead.id)}
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white border-border/40">
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No leads found</p>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="mt-4 bg-gold hover:bg-gold/90"
            >
              Add Your First Lead
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Lead Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Partner 1 Name</Label>
                <Input
                  value={formData.partner1_name}
                  onChange={(e) => setFormData({ ...formData, partner1_name: e.target.value })}
                  placeholder="Name"
                  data-testid="partner1-name-input"
                />
              </div>
              <div>
                <Label>Partner 2 Name</Label>
                <Input
                  value={formData.partner2_name}
                  onChange={(e) => setFormData({ ...formData, partner2_name: e.target.value })}
                  placeholder="Name"
                  data-testid="partner2-name-input"
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                data-testid="email-input"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
                data-testid="phone-input"
              />
            </div>
            <div>
              <Label>Wedding Date</Label>
              <Input
                type="date"
                value={formData.wedding_date}
                onChange={(e) => setFormData({ ...formData, wedding_date: e.target.value })}
                data-testid="wedding-date-input"
              />
            </div>
            <div>
              <Label>Venue</Label>
              <Input
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                placeholder="Wedding venue"
                data-testid="venue-input"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Any additional notes..."
                data-testid="message-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddLead}
              className="bg-obsidian hover:bg-obsidian/90"
              data-testid="submit-lead-btn"
            >
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote Builder Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Build Quote</DialogTitle>
            {selectedLead && (
              <p className="text-muted-foreground">
                For {selectedLead.partner1_name} & {selectedLead.partner2_name}
              </p>
            )}
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Main Packages */}
            <div>
              <h3 className="font-display text-lg text-obsidian mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-gold" />
                Select Package
              </h3>
              {packages.length > 0 ? (
                <div className="grid gap-3">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`p-4 rounded-sm border-2 cursor-pointer transition-all duration-200 ${
                        selectedPackages.includes(pkg.id)
                          ? "border-gold bg-gold/5"
                          : "border-border/40 hover:border-gold/50"
                      }`}
                      onClick={() => togglePackage(pkg.id)}
                      data-testid={`package-option-${pkg.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedPackages.includes(pkg.id)}
                            className="mt-1"
                          />
                          <div>
                            <h4 className="font-medium text-obsidian">{pkg.name}</h4>
                            <p className="text-sm text-muted-foreground">{pkg.description}</p>
                            {pkg.includes?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {pkg.includes.map((item, i) => (
                                  <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="font-display text-xl text-gold">
                          £{pkg.price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No packages created yet. Create packages in Settings first.
                </p>
              )}
            </div>

            <Separator />

            {/* Add-ons */}
            <div>
              <h3 className="font-display text-lg text-obsidian mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sage" />
                Add-ons
              </h3>
              {addons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {addons.map((addon) => (
                    <div
                      key={addon.id}
                      className={`p-4 rounded-sm border-2 cursor-pointer transition-all duration-200 ${
                        selectedAddons[addon.id]
                          ? "border-sage bg-sage/5"
                          : "border-border/40 hover:border-sage/50"
                      }`}
                      onClick={() => toggleAddon(addon.id)}
                      data-testid={`addon-option-${addon.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={!!selectedAddons[addon.id]}
                            className="mt-1"
                          />
                          <div>
                            <h4 className="font-medium text-obsidian">{addon.name}</h4>
                            <p className="text-xs text-muted-foreground">{addon.description}</p>
                          </div>
                        </div>
                        <p className="font-display text-sage">
                          £{addon.price.toLocaleString()}
                        </p>
                      </div>
                      
                      {/* Quantity selector for selected addons */}
                      {selectedAddons[addon.id] && (
                        <div className="flex items-center gap-2 mt-3 ml-7" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs text-muted-foreground">Qty:</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateAddonQuantity(addon.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">
                            {addonQuantities[addon.id] || 1}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateAddonQuantity(addon.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No add-ons created yet. Create add-ons in Settings.
                </p>
              )}
            </div>

            <Separator />

            {/* Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount (£)</Label>
                <Input
                  type="number"
                  value={quoteDiscount}
                  onChange={(e) => setQuoteDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  data-testid="quote-discount-input"
                />
              </div>
              <div>
                <Label>Discount Reason (optional)</Label>
                <Input
                  value={discountNote}
                  onChange={(e) => setDiscountNote(e.target.value)}
                  placeholder="e.g., Early booking discount"
                  data-testid="discount-note-input"
                />
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <Label>Personal Message (optional)</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal message to your quote..."
                rows={3}
                data-testid="custom-message-input"
              />
            </div>

            {/* Quote Summary */}
            <div className="bg-obsidian text-white p-6 rounded-sm">
              <h4 className="font-display text-lg mb-4">Quote Summary</h4>
              
              {/* Selected Items */}
              <div className="space-y-2 mb-4">
                {selectedPackages.map(pkgId => {
                  const pkg = packages.find(p => p.id === pkgId);
                  return pkg ? (
                    <div key={pkgId} className="flex justify-between text-sm">
                      <span>{pkg.name}</span>
                      <span>£{pkg.price.toLocaleString()}</span>
                    </div>
                  ) : null;
                })}
                {Object.keys(selectedAddons).filter(id => selectedAddons[id]).map(addonId => {
                  const addon = addons.find(a => a.id === addonId);
                  const qty = addonQuantities[addonId] || 1;
                  return addon ? (
                    <div key={addonId} className="flex justify-between text-sm">
                      <span>{addon.name} {qty > 1 ? `x${qty}` : ""}</span>
                      <span>£{(addon.price * qty).toLocaleString()}</span>
                    </div>
                  ) : null;
                })}
              </div>

              <Separator className="bg-white/20 my-4" />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>£{subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-gold">
                    <span>Discount</span>
                    <span>-£{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-display pt-2 border-t border-white/20">
                  <span>Total</span>
                  <span>£{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowQuoteModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleSendQuote(false)}
              disabled={selectedPackages.length === 0 && Object.values(selectedAddons).every(v => !v)}
              variant="outline"
              data-testid="save-quote-btn"
            >
              Save Quote Only
            </Button>
            <Button
              onClick={() => handleSendQuote(true)}
              disabled={selectedPackages.length === 0 && Object.values(selectedAddons).every(v => !v)}
              className="bg-gold hover:bg-gold/90"
              data-testid="send-quote-email-btn"
            >
              <Mail className="w-4 h-4 mr-2" />
              Save & Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
