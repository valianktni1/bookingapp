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
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [quoteTemplates, setQuoteTemplates] = useState([]);
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
    fetchQuoteTemplates();
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

  const fetchQuoteTemplates = async () => {
    try {
      const response = await axios.get(`${API}/quote-templates`);
      setQuoteTemplates(response.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
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

  const handleSendQuote = async (templateId) => {
    if (!selectedLead || !templateId) return;
    try {
      await axios.post(`${API}/quotes`, {
        lead_id: selectedLead.id,
        template_id: templateId,
        valid_days: 14
      });
      toast.success("Quote sent successfully");
      setShowQuoteModal(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (error) {
      console.error("Error sending quote:", error);
      toast.error("Failed to send quote");
    }
  };

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
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowQuoteModal(true);
                        }}
                        className="border-gold text-gold hover:bg-gold hover:text-white"
                        data-testid={`send-quote-btn-${index}`}
                      >
                        <Send className="w-4 h-4 mr-1" /> Send Quote
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
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
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

      {/* Send Quote Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Send Quote</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="py-4">
              <p className="text-muted-foreground mb-4">
                Sending quote to <strong>{selectedLead.partner1_name} & {selectedLead.partner2_name}</strong>
              </p>
              {quoteTemplates.length > 0 ? (
                <div className="space-y-3">
                  {quoteTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      className="cursor-pointer hover:border-gold transition-colors duration-200"
                      onClick={() => handleSendQuote(template.id)}
                      data-testid={`quote-template-${template.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-obsidian">{template.name}</h4>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          </div>
                          <p className="font-display text-lg text-gold">
                            £{template.price.toLocaleString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No quote templates found. Create templates in Settings first.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
