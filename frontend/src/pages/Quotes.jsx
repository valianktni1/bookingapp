import { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO } from "date-fns";
import { 
  FileText,
  Check,
  Clock,
  X,
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  sent: { label: "Pending", class: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
  accepted: { label: "Accepted", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: Check },
  declined: { label: "Declined", class: "bg-red-500/10 text-red-500 border-red-500/20", icon: X }
};

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [leads, setLeads] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [contractTemplates, setContractTemplates] = useState([]);
  const [selectedContractTemplate, setSelectedContractTemplate] = useState("");

  useEffect(() => {
    fetchQuotes();
    fetchContractTemplates();
  }, []);

  const fetchQuotes = async () => {
    try {
      const [quotesRes, leadsRes] = await Promise.all([
        axios.get(`${API}/quotes`),
        axios.get(`${API}/leads`)
      ]);
      
      setQuotes(quotesRes.data);
      
      // Create leads lookup
      const leadsMap = {};
      leadsRes.data.forEach(lead => {
        leadsMap[lead.id] = lead;
      });
      setLeads(leadsMap);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast.error("Failed to load quotes");
    } finally {
      setLoading(false);
    }
  };

  const fetchContractTemplates = async () => {
    try {
      const response = await axios.get(`${API}/contract-templates`);
      setContractTemplates(response.data);
    } catch (error) {
      console.error("Error fetching contract templates:", error);
    }
  };

  const handleAcceptQuote = async () => {
    if (!selectedQuote || !selectedContractTemplate) {
      toast.error("Please select a contract template");
      return;
    }

    try {
      const response = await axios.post(
        `${API}/jobs/accept-quote/${selectedQuote.id}?contract_template_id=${selectedContractTemplate}`
      );
      
      toast.success("Quote accepted! Job created successfully.");
      setShowAcceptModal(false);
      setSelectedQuote(null);
      setSelectedContractTemplate("");
      fetchQuotes();
      
      // Show portal link
      if (response.data.portal_url) {
        toast.info(`Client portal: ${window.location.origin}${response.data.portal_url}`);
      }
    } catch (error) {
      console.error("Error accepting quote:", error);
      toast.error("Failed to accept quote");
    }
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
        <h1 className="font-display text-3xl text-obsidian">Quotes</h1>
        <p className="text-muted-foreground mt-1">Track sent quotes and acceptances</p>
      </div>

      {/* Quotes List */}
      {quotes.length > 0 ? (
        <div className="grid gap-4">
          {quotes.map((quote, index) => {
            const lead = leads[quote.lead_id];
            const status = statusConfig[quote.status] || statusConfig.sent;
            const StatusIcon = status.icon;

            return (
              <Card 
                key={quote.id}
                className="bg-white border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300"
                data-testid={`quote-card-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-display text-lg text-obsidian">
                          {lead ? `${lead.partner1_name} & ${lead.partner2_name}` : "Unknown Client"}
                        </h3>
                        <Badge className={status.class}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p><strong>Package:</strong> {quote.template_name}</p>
                        <p><strong>Sent:</strong> {format(parseISO(quote.created_at), "dd MMM yyyy")}</p>
                        <p><strong>Valid Until:</strong> {format(parseISO(quote.valid_until), "dd MMM yyyy")}</p>
                      </div>

                      {quote.includes && quote.includes.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Includes:</p>
                          <div className="flex flex-wrap gap-2">
                            {quote.includes.map((item, i) => (
                              <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <p className="font-display text-2xl text-gold">
                        £{quote.price.toLocaleString()}
                      </p>

                      {quote.status === "sent" && (
                        <Button
                          onClick={() => {
                            setSelectedQuote(quote);
                            setShowAcceptModal(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700"
                          data-testid={`accept-quote-btn-${index}`}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Mark Accepted
                        </Button>
                      )}
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
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-display text-obsidian mb-2">No quotes sent yet</p>
            <p className="text-muted-foreground">
              Send quotes to your leads from the Leads page
            </p>
          </CardContent>
        </Card>
      )}

      {/* Accept Quote Modal */}
      <Dialog open={showAcceptModal} onOpenChange={setShowAcceptModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Accept Quote</DialogTitle>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="py-4">
              <p className="text-muted-foreground mb-4">
                This will create a job with invoice, contract, and booking form for{" "}
                <strong>
                  {leads[selectedQuote.lead_id]?.partner1_name} & {leads[selectedQuote.lead_id]?.partner2_name}
                </strong>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-obsidian mb-2">
                    Select Contract Template
                  </label>
                  <Select 
                    value={selectedContractTemplate} 
                    onValueChange={setSelectedContractTemplate}
                  >
                    <SelectTrigger data-testid="contract-template-select">
                      <SelectValue placeholder="Choose a contract template" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {contractTemplates.length === 0 && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                    No contract templates found. Please create one in Settings first.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcceptModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAcceptQuote}
              disabled={!selectedContractTemplate}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="confirm-accept-quote-btn"
            >
              Create Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
