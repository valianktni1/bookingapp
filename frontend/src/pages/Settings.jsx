import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Save,
  Plus,
  Trash2,
  FileText,
  FileSignature,
  Building2,
  Package,
  Sparkles,
  Mail,
  Send,
  TestTube
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [packages, setPackages] = useState([]);
  const [contractTemplates, setContractTemplates] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  // Modal states
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showEmailTemplateModal, setShowEmailTemplateModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [editingEmailTemplate, setEditingEmailTemplate] = useState(null);

  // Form states
  const [packageForm, setPackageForm] = useState({
    name: "",
    description: "",
    price: "",
    package_type: "main",
    includes: "",
    sort_order: 0
  });
  const [contractForm, setContractForm] = useState({
    name: "",
    content: ""
  });
  const [emailTemplateForm, setEmailTemplateForm] = useState({
    name: "",
    subject: "",
    body: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, packagesRes, contractsRes, emailTemplatesRes] = await Promise.all([
        axios.get(`${API}/settings`),
        axios.get(`${API}/packages?active_only=false`),
        axios.get(`${API}/contract-templates?active_only=false`),
        axios.get(`${API}/email-templates`)
      ]);
      
      setSettings(settingsRes.data);
      setPackages(packagesRes.data);
      setContractTemplates(contractsRes.data);
      setEmailTemplates(emailTemplatesRes.data);
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

  const handleSavePackage = async () => {
    try {
      const data = {
        name: packageForm.name,
        description: packageForm.description,
        price: parseFloat(packageForm.price),
        package_type: packageForm.package_type,
        includes: packageForm.includes.split("\n").filter(i => i.trim()),
        sort_order: parseInt(packageForm.sort_order) || 0
      };

      if (editingPackage) {
        await axios.put(`${API}/packages/${editingPackage.id}`, data);
        toast.success("Package updated");
      } else {
        await axios.post(`${API}/packages`, data);
        toast.success("Package created");
      }

      setShowPackageModal(false);
      setEditingPackage(null);
      setPackageForm({ name: "", description: "", price: "", package_type: "main", includes: "", sort_order: 0 });
      fetchData();
    } catch (error) {
      console.error("Error saving package:", error);
      toast.error("Failed to save package");
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

  const handleSaveEmailTemplate = async () => {
    try {
      const data = {
        name: emailTemplateForm.name,
        subject: emailTemplateForm.subject,
        body: emailTemplateForm.body
      };

      if (editingEmailTemplate) {
        await axios.put(`${API}/email-templates/${editingEmailTemplate.id}`, data);
        toast.success("Email template updated");
      } else {
        await axios.post(`${API}/email-templates`, data);
        toast.success("Email template created");
      }

      setShowEmailTemplateModal(false);
      setEditingEmailTemplate(null);
      setEmailTemplateForm({ name: "", subject: "", body: "" });
      fetchData();
    } catch (error) {
      console.error("Error saving email template:", error);
      toast.error("Failed to save email template");
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      await axios.post(`${API}/settings/test-email`);
      toast.success("Test email sent! Check your inbox.");
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error(error.response?.data?.detail || "Failed to send test email. Check your SMTP settings.");
    } finally {
      setTestingEmail(false);
    }
  };

  const handleDeletePackage = async (id) => {
    if (!window.confirm("Are you sure you want to delete this package?")) return;
    try {
      await axios.delete(`${API}/packages/${id}`);
      toast.success("Package deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting package:", error);
      toast.error("Failed to delete package");
    }
  };

  const openEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price.toString(),
      package_type: pkg.package_type,
      includes: pkg.includes.join("\n"),
      sort_order: pkg.sort_order || 0
    });
    setShowPackageModal(true);
  };

  const openEditContract = (template) => {
    setEditingContract(template);
    setContractForm({
      name: template.name,
      content: template.content
    });
    setShowContractModal(true);
  };

  const openEditEmailTemplate = (template) => {
    setEditingEmailTemplate(template);
    setEmailTemplateForm({
      name: template.name,
      subject: template.subject,
      body: template.body
    });
    setShowEmailTemplateModal(true);
  };

  const mainPackages = packages.filter(p => p.package_type === "main");
  const addons = packages.filter(p => p.package_type === "addon");

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
        <p className="text-muted-foreground mt-1">Manage your business settings, packages and templates</p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="bg-white border border-border/40 flex-wrap">
          <TabsTrigger value="business" data-testid="tab-business">
            <Building2 className="w-4 h-4 mr-2" />
            Business Info
          </TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email">
            <Mail className="w-4 h-4 mr-2" />
            Email Settings
          </TabsTrigger>
          <TabsTrigger value="packages" data-testid="tab-packages">
            <Package className="w-4 h-4 mr-2" />
            Packages
          </TabsTrigger>
          <TabsTrigger value="addons" data-testid="tab-addons">
            <Sparkles className="w-4 h-4 mr-2" />
            Add-ons
          </TabsTrigger>
          <TabsTrigger value="contracts" data-testid="tab-contracts">
            <FileSignature className="w-4 h-4 mr-2" />
            Contracts
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>Deposit Amount (£)</Label>
                    <Input
                      type="number"
                      value={settings?.deposit_amount || 100}
                      onChange={(e) => setSettings({ ...settings, deposit_amount: parseFloat(e.target.value) })}
                      data-testid="deposit-amount-input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Fixed deposit amount (e.g., £100)</p>
                  </div>
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

              <div className="pt-6 border-t border-border">
                <h3 className="font-display text-lg text-obsidian mb-4">Business Logo</h3>
                <div className="flex items-start gap-6">
                  <div className="flex-1">
                    <Label>Logo URL</Label>
                    <Input
                      value={settings?.logo_url || ""}
                      onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                      placeholder="https://example.com/your-logo.png"
                      data-testid="logo-url-input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Enter the URL of your logo image</p>
                  </div>
                  {settings?.logo_url && (
                    <div className="w-32 h-20 bg-obsidian rounded-sm flex items-center justify-center p-2">
                      <img 
                        src={settings.logo_url} 
                        alt="Business Logo Preview" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
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

        {/* Email Settings Tab */}
        <TabsContent value="email">
          <div className="space-y-6">
            {/* SMTP Settings Card */}
            <Card className="bg-white border-border/40 shadow-sm">
              <CardHeader>
                <CardTitle className="font-display text-xl">SMTP Settings</CardTitle>
                <p className="text-sm text-muted-foreground">Configure your email server to send quotes and notifications</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>SMTP Host</Label>
                    <Input
                      value={settings?.smtp_settings?.host || ""}
                      onChange={(e) => setSettings({
                        ...settings,
                        smtp_settings: { ...settings?.smtp_settings, host: e.target.value }
                      })}
                      placeholder="smtp.hostinger.com"
                      data-testid="smtp-host-input"
                    />
                  </div>
                  <div>
                    <Label>SMTP Port</Label>
                    <Input
                      type="number"
                      value={settings?.smtp_settings?.port || 587}
                      onChange={(e) => setSettings({
                        ...settings,
                        smtp_settings: { ...settings?.smtp_settings, port: parseInt(e.target.value) }
                      })}
                      placeholder="587"
                      data-testid="smtp-port-input"
                    />
                  </div>
                  <div>
                    <Label>Username / Email</Label>
                    <Input
                      value={settings?.smtp_settings?.username || ""}
                      onChange={(e) => setSettings({
                        ...settings,
                        smtp_settings: { ...settings?.smtp_settings, username: e.target.value }
                      })}
                      placeholder="mark@perfectweddingsbymark.uk"
                      data-testid="smtp-username-input"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={settings?.smtp_settings?.password || ""}
                      onChange={(e) => setSettings({
                        ...settings,
                        smtp_settings: { ...settings?.smtp_settings, password: e.target.value }
                      })}
                      placeholder="••••••••"
                      data-testid="smtp-password-input"
                    />
                  </div>
                  <div>
                    <Label>From Email</Label>
                    <Input
                      value={settings?.smtp_settings?.from_email || ""}
                      onChange={(e) => setSettings({
                        ...settings,
                        smtp_settings: { ...settings?.smtp_settings, from_email: e.target.value }
                      })}
                      placeholder="mark@perfectweddingsbymark.uk"
                      data-testid="smtp-from-email-input"
                    />
                  </div>
                  <div>
                    <Label>From Name</Label>
                    <Input
                      value={settings?.smtp_settings?.from_name || ""}
                      onChange={(e) => setSettings({
                        ...settings,
                        smtp_settings: { ...settings?.smtp_settings, from_name: e.target.value }
                      })}
                      placeholder="Weddings By Mark"
                      data-testid="smtp-from-name-input"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings?.smtp_settings?.use_tls !== false}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        smtp_settings: { ...settings?.smtp_settings, use_tls: checked }
                      })}
                      data-testid="smtp-tls-switch"
                    />
                    <Label>Use TLS (recommended)</Label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="bg-obsidian hover:bg-obsidian/90"
                    data-testid="save-smtp-btn"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save SMTP Settings"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTestEmail}
                    disabled={testingEmail || !settings?.smtp_settings?.host}
                    data-testid="test-email-btn"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {testingEmail ? "Sending..." : "Send Test Email"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Email Templates Card */}
            <Card className="bg-white border-border/40 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-display text-xl">Email Templates</CardTitle>
                  <p className="text-sm text-muted-foreground">Customize your quote and notification emails</p>
                </div>
                <Button
                  onClick={() => {
                    setEditingEmailTemplate(null);
                    setEmailTemplateForm({ name: "", subject: "", body: "" });
                    setShowEmailTemplateModal(true);
                  }}
                  className="bg-gold hover:bg-gold/90"
                  data-testid="add-email-template-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Template
                </Button>
              </CardHeader>
              <CardContent>
                {emailTemplates.length > 0 ? (
                  <div className="space-y-4">
                    {emailTemplates.map((template, index) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-4 bg-bone rounded-sm"
                        data-testid={`email-template-item-${index}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-obsidian">{template.name}</h4>
                            {template.name === "quote_email" && (
                              <Badge className="bg-gold/10 text-gold border-gold/20">Default Quote</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">Subject: {template.subject}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditEmailTemplate(template)}
                        >
                          Edit
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No email templates yet</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      A default quote template will be created automatically
                    </p>
                  </div>
                )}

                <div className="mt-6 p-4 bg-muted/30 rounded-sm">
                  <h4 className="font-medium text-obsidian mb-2">Available Placeholders</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <code className="bg-obsidian/10 px-2 py-1 rounded">%client_name%</code>
                    <code className="bg-obsidian/10 px-2 py-1 rounded">%partner1_name%</code>
                    <code className="bg-obsidian/10 px-2 py-1 rounded">%partner2_name%</code>
                    <code className="bg-obsidian/10 px-2 py-1 rounded">%wedding_date%</code>
                    <code className="bg-obsidian/10 px-2 py-1 rounded">%quote_link%</code>
                    <code className="bg-obsidian/10 px-2 py-1 rounded">%phone%</code>
                    <code className="bg-obsidian/10 px-2 py-1 rounded">%email%</code>
                    <code className="bg-obsidian/10 px-2 py-1 rounded">%deposit_amount%</code>
                    <code className="bg-obsidian/10 px-2 py-1 rounded">%sort_code%</code>
                    <code className="bg-obsidian/10 px-2 py-1 rounded">%account_number%</code>
                    <code className="bg-obsidian/10 px-2 py-1 rounded">%account_name%</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Main Packages Tab */}
        <TabsContent value="packages">
          <Card className="bg-white border-border/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display text-xl">Main Packages</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Your core photography packages (Full Day, Half Day, etc.)</p>
              </div>
              <Button
                onClick={() => {
                  setEditingPackage(null);
                  setPackageForm({ name: "", description: "", price: "", package_type: "main", includes: "", sort_order: 0 });
                  setShowPackageModal(true);
                }}
                className="bg-gold hover:bg-gold/90"
                data-testid="add-package-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Package
              </Button>
            </CardHeader>
            <CardContent>
              {mainPackages.length > 0 ? (
                <div className="space-y-4">
                  {mainPackages.map((pkg, index) => (
                    <div
                      key={pkg.id}
                      className="flex items-center justify-between p-4 bg-bone rounded-sm"
                      data-testid={`package-item-${index}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-obsidian">{pkg.name}</h4>
                          <Badge className="bg-gold/10 text-gold border-gold/20">Main Package</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{pkg.description}</p>
                        {pkg.includes?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pkg.includes.slice(0, 3).map((item, i) => (
                              <span key={i} className="text-xs bg-white px-2 py-1 rounded border border-border/40">
                                {item}
                              </span>
                            ))}
                            {pkg.includes.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{pkg.includes.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-display text-xl text-gold">£{pkg.price.toLocaleString()}</p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditPackage(pkg)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No packages yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create packages like "Full Day Coverage", "Half Day", etc.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add-ons Tab */}
        <TabsContent value="addons">
          <Card className="bg-white border-border/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display text-xl">Add-ons</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Extra services couples can add to their package</p>
              </div>
              <Button
                onClick={() => {
                  setEditingPackage(null);
                  setPackageForm({ name: "", description: "", price: "", package_type: "addon", includes: "", sort_order: 0 });
                  setShowPackageModal(true);
                }}
                className="bg-sage hover:bg-sage/90 text-white"
                data-testid="add-addon-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Add-on
              </Button>
            </CardHeader>
            <CardContent>
              {addons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {addons.map((addon, index) => (
                    <div
                      key={addon.id}
                      className="p-4 bg-bone rounded-sm"
                      data-testid={`addon-item-${index}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-obsidian">{addon.name}</h4>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditPackage(addon)}
                          >
                            <FileText className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleDeletePackage(addon.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{addon.description}</p>
                      <p className="font-display text-lg text-sage">£{addon.price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No add-ons yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create add-ons like "Extra Hour", "Selfie Booth", "Wedding Album", "Travel Charge"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suggested Add-ons */}
          {addons.length === 0 && (
            <Card className="bg-white border-border/40 shadow-sm mt-6">
              <CardHeader>
                <CardTitle className="font-display text-lg">Suggested Add-ons to Create</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { name: "Extra Hour", price: "150" },
                    { name: "Selfie Booth", price: "300" },
                    { name: "Wedding Album", price: "400" },
                    { name: "Travel Charge", price: "50" },
                    { name: "Engagement Shoot", price: "200" },
                    { name: "Second Photographer", price: "500" },
                    { name: "USB Drive", price: "75" },
                    { name: "Canvas Print", price: "150" }
                  ].map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="justify-start h-auto py-3"
                      onClick={() => {
                        setEditingPackage(null);
                        setPackageForm({
                          name: suggestion.name,
                          description: "",
                          price: suggestion.price,
                          package_type: "addon",
                          includes: "",
                          sort_order: i
                        });
                        setShowPackageModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {suggestion.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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

      {/* Package/Add-on Modal */}
      <Dialog open={showPackageModal} onOpenChange={setShowPackageModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingPackage ? "Edit" : "Add"} {packageForm.package_type === "addon" ? "Add-on" : "Package"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={packageForm.name}
                onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                placeholder={packageForm.package_type === "addon" ? "e.g., Extra Hour" : "e.g., Full Day Coverage"}
                data-testid="package-name-input"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={packageForm.description}
                onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                placeholder="Brief description"
                data-testid="package-description-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (£)</Label>
                <Input
                  type="number"
                  value={packageForm.price}
                  onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                  placeholder="1500"
                  data-testid="package-price-input"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select 
                  value={packageForm.package_type} 
                  onValueChange={(v) => setPackageForm({ ...packageForm, package_type: v })}
                >
                  <SelectTrigger data-testid="package-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main Package</SelectItem>
                    <SelectItem value="addon">Add-on</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {packageForm.package_type === "main" && (
              <div>
                <Label>What's Included (one per line)</Label>
                <Textarea
                  value={packageForm.includes}
                  onChange={(e) => setPackageForm({ ...packageForm, includes: e.target.value })}
                  placeholder="8 hours coverage&#10;500+ edited photos&#10;Online gallery&#10;USB drive"
                  rows={5}
                  data-testid="package-includes-input"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackageModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePackage}
              className="bg-obsidian hover:bg-obsidian/90"
              data-testid="save-package-btn"
            >
              {editingPackage ? "Update" : "Create"}
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
