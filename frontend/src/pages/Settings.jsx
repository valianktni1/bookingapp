import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Save,
  Plus,
  Trash2,
  FileText,
  FileSignature,
  Building2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [quoteTemplates, setQuoteTemplates] = useState([]);
  const [contractTemplates, setContractTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [editingContract, setEditingContract] = useState(null);

  // Form states
  const [quoteForm, setQuoteForm] = useState({
    name: "",
    description: "",
    price: "",
    includes: ""
  });
  const [contractForm, setContractForm] = useState({
    name: "",
    content: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, quotesRes, contractsRes] = await Promise.all([
        axios.get(`${API}/settings`),
        axios.get(`${API}/quote-templates?active_only=false`),
        axios.get(`${API}/contract-templates?active_only=false`)
      ]);
      
      setSettings(settingsRes.data);
      setQuoteTemplates(quotesRes.data);
      setContractTemplates(contractsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, settings);
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuoteTemplate = async () => {
    try {
      const data = {
        name: quoteForm.name,
        description: quoteForm.description,
        price: parseFloat(quoteForm.price),
        includes: quoteForm.includes.split("\n").filter(i => i.trim())
      };

      if (editingQuote) {
        await axios.put(`${API}/quote-templates/${editingQuote.id}`, data);
        toast.success("Quote template updated");
      } else {
        await axios.post(`${API}/quote-templates`, data);
        toast.success("Quote template created");
      }

      setShowQuoteModal(false);
      setEditingQuote(null);
      setQuoteForm({ name: "", description: "", price: "", includes: "" });
      fetchData();
    } catch (error) {
      console.error("Error saving quote template:", error);
      toast.error("Failed to save quote template");
    }
  };

  const handleSaveContractTemplate = async () => {
    try {
      const data = {
        name: contractForm.name,
        content: contractForm.content
      };

      if (editingContract) {
        await axios.put(`${API}/contract-templates/${editingContract.id}`, data);
        toast.success("Contract template updated");
      } else {
        await axios.post(`${API}/contract-templates`, data);
        toast.success("Contract template created");
      }

      setShowContractModal(false);
      setEditingContract(null);
      setContractForm({ name: "", content: "" });
      fetchData();
    } catch (error) {
      console.error("Error saving contract template:", error);
      toast.error("Failed to save contract template");
    }
  };

  const handleDeleteQuoteTemplate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await axios.delete(`${API}/quote-templates/${id}`);
      toast.success("Template deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const openEditQuote = (template) => {
    setEditingQuote(template);
    setQuoteForm({
      name: template.name,
      description: template.description,
      price: template.price.toString(),
      includes: template.includes.join("\n")
    });
    setShowQuoteModal(true);
  };

  const openEditContract = (template) => {
    setEditingContract(template);
    setContractForm({
      name: template.name,
      content: template.content
    });
    setShowContractModal(true);
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
        <h1 className="font-display text-3xl text-obsidian">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business settings and templates</p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="bg-white border border-border/40">
          <TabsTrigger value="business" data-testid="tab-business">
            <Building2 className="w-4 h-4 mr-2" />
            Business Info
          </TabsTrigger>
          <TabsTrigger value="quotes" data-testid="tab-quotes">
            <FileText className="w-4 h-4 mr-2" />
            Quote Templates
          </TabsTrigger>
          <TabsTrigger value="contracts" data-testid="tab-contracts">
            <FileSignature className="w-4 h-4 mr-2" />
            Contract Templates
          </TabsTrigger>
        </TabsList>

        {/* Business Info Tab */}
        <TabsContent value="business">
          <Card className="bg-white border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-xl">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Business Name</Label>
                  <Input
                    value={settings?.business_name || ""}
                    onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                    data-testid="business-name-input"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={settings?.email || ""}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    data-testid="business-email-input"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={settings?.phone || ""}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    data-testid="business-phone-input"
                  />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    value={settings?.website || ""}
                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                    data-testid="business-website-input"
                  />
                </div>
              </div>

              <div>
                <Label>Address</Label>
                <Textarea
                  value={settings?.address || ""}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  data-testid="business-address-input"
                />
              </div>

              <div className="pt-6 border-t border-border">
                <h3 className="font-display text-lg text-obsidian mb-4">Bank Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>Account Name</Label>
                    <Input
                      value={settings?.bank_details?.account_name || ""}
                      onChange={(e) => setSettings({
                        ...settings,
                        bank_details: { ...settings.bank_details, account_name: e.target.value }
                      })}
                      data-testid="bank-account-name-input"
                    />
                  </div>
                  <div>
                    <Label>Sort Code</Label>
                    <Input
                      value={settings?.bank_details?.sort_code || ""}
                      onChange={(e) => setSettings({
                        ...settings,
                        bank_details: { ...settings.bank_details, sort_code: e.target.value }
                      })}
                      placeholder="00-00-00"
                      data-testid="bank-sort-code-input"
                    />
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <Input
                      value={settings?.bank_details?.account_number || ""}
                      onChange={(e) => setSettings({
                        ...settings,
                        bank_details: { ...settings.bank_details, account_number: e.target.value }
                      })}
                      placeholder="00000000"
                      data-testid="bank-account-number-input"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <h3 className="font-display text-lg text-obsidian mb-4">Payment Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Deposit Due (days after booking)</Label>
                    <Input
                      type="number"
                      value={settings?.deposit_days || 1}
                      onChange={(e) => setSettings({ ...settings, deposit_days: parseInt(e.target.value) })}
                      data-testid="deposit-days-input"
                    />
                  </div>
                  <div>
                    <Label>Balance Due (days before wedding)</Label>
                    <Input
                      type="number"
                      value={settings?.balance_days_before || 45}
                      onChange={(e) => setSettings({ ...settings, balance_days_before: parseInt(e.target.value) })}
                      data-testid="balance-days-input"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-obsidian hover:bg-obsidian/90"
                data-testid="save-settings-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quote Templates Tab */}
        <TabsContent value="quotes">
          <Card className="bg-white border-border/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-xl">Quote Templates</CardTitle>
              <Button
                onClick={() => {
                  setEditingQuote(null);
                  setQuoteForm({ name: "", description: "", price: "", includes: "" });
                  setShowQuoteModal(true);
                }}
                className="bg-gold hover:bg-gold/90"
                data-testid="add-quote-template-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            </CardHeader>
            <CardContent>
              {quoteTemplates.length > 0 ? (
                <div className="space-y-4">
                  {quoteTemplates.map((template, index) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 bg-bone rounded-sm"
                      data-testid={`quote-template-item-${index}`}
                    >
                      <div>
                        <h4 className="font-medium text-obsidian">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        <p className="text-sm text-gold font-display mt-1">£{template.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditQuote(template)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteQuoteTemplate(template.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No quote templates yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contract Templates Tab */}
        <TabsContent value="contracts">
          <Card className="bg-white border-border/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-xl">Contract Templates</CardTitle>
              <Button
                onClick={() => {
                  setEditingContract(null);
                  setContractForm({ name: "", content: "" });
                  setShowContractModal(true);
                }}
                className="bg-gold hover:bg-gold/90"
                data-testid="add-contract-template-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            </CardHeader>
            <CardContent>
              {contractTemplates.length > 0 ? (
                <div className="space-y-4">
                  {contractTemplates.map((template, index) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 bg-bone rounded-sm"
                      data-testid={`contract-template-item-${index}`}
                    >
                      <div>
                        <h4 className="font-medium text-obsidian">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {template.content.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditContract(template)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileSignature className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No contract templates yet</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Use placeholders: {"{{partner1_name}}"}, {"{{partner2_name}}"}, {"{{wedding_date}}"}, {"{{package_name}}"}, {"{{package_price}}"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quote Template Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingQuote ? "Edit Quote Template" : "Add Quote Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Package Name</Label>
              <Input
                value={quoteForm.name}
                onChange={(e) => setQuoteForm({ ...quoteForm, name: e.target.value })}
                placeholder="e.g., Full Day Coverage"
                data-testid="quote-name-input"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={quoteForm.description}
                onChange={(e) => setQuoteForm({ ...quoteForm, description: e.target.value })}
                placeholder="Brief description of the package"
                data-testid="quote-description-input"
              />
            </div>
            <div>
              <Label>Price (£)</Label>
              <Input
                type="number"
                value={quoteForm.price}
                onChange={(e) => setQuoteForm({ ...quoteForm, price: e.target.value })}
                placeholder="1500"
                data-testid="quote-price-input"
              />
            </div>
            <div>
              <Label>What's Included (one per line)</Label>
              <Textarea
                value={quoteForm.includes}
                onChange={(e) => setQuoteForm({ ...quoteForm, includes: e.target.value })}
                placeholder="8 hours coverage&#10;500+ edited photos&#10;Online gallery&#10;USB drive"
                rows={5}
                data-testid="quote-includes-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuoteTemplate}
              className="bg-obsidian hover:bg-obsidian/90"
              data-testid="save-quote-template-btn"
            >
              {editingQuote ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract Template Modal */}
      <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingContract ? "Edit Contract Template" : "Add Contract Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={contractForm.name}
                onChange={(e) => setContractForm({ ...contractForm, name: e.target.value })}
                placeholder="e.g., Standard Wedding Contract"
                data-testid="contract-name-input"
              />
            </div>
            <div>
              <Label>Contract Content</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Available placeholders: {"{{partner1_name}}"}, {"{{partner2_name}}"}, {"{{wedding_date}}"}, {"{{package_name}}"}, {"{{package_price}}"}, {"{{deposit_amount}}"}, {"{{balance_amount}}"}
              </p>
              <Textarea
                value={contractForm.content}
                onChange={(e) => setContractForm({ ...contractForm, content: e.target.value })}
                placeholder="Enter your contract terms..."
                rows={15}
                className="font-mono text-sm"
                data-testid="contract-content-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveContractTemplate}
              className="bg-obsidian hover:bg-obsidian/90"
              data-testid="save-contract-template-btn"
            >
              {editingContract ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
