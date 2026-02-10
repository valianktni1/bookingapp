import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { format, parseISO } from "date-fns";
import { 
  Camera,
  Calendar,
  FileText,
  Receipt,
  FileSignature,
  Check,
  Clock,
  Phone,
  Mail,
  MapPin,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ClientPortal() {
  const { token } = useParams();
  const [portalData, setPortalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingForm, setBookingForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    fetchPortalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchPortalData = async () => {
    try {
      const response = await axios.get(`${API}/portal/${token}`);
      setPortalData(response.data);
      // Initialize booking form responses from existing data
      if (response.data.booking_form_response?.responses) {
        setBookingForm(response.data.booking_form_response.responses);
      }
    } catch (err) {
      console.error("Error fetching portal:", err);
      setError("Portal not found or link expired");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBookingForm = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/public/booking-form/${portalData.job.id}/submit`, {
        responses: bookingForm
      });
      toast.success("Booking details saved successfully!");
      fetchPortalData();
    } catch (err) {
      console.error("Error saving booking form:", err);
      toast.error("Failed to save details");
    } finally {
      setSaving(false);
    }
  };

  // Signature canvas functions
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSignContract = async () => {
    if (!signatureName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const signatureData = canvas.toDataURL();
    
    try {
      await axios.post(`${API}/contracts/${portalData.contract.id}/sign`, {
        signature_data: signatureData,
        signed_by: signatureName
      });
      toast.success("Contract signed successfully");
      fetchPortalData();
    } catch (err) {
      console.error("Error signing contract:", err);
      toast.error("Failed to sign contract");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <div className="text-center">
          <Camera className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-obsidian mb-2">Portal Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const { business, job, invoice, contract, booking_form } = portalData;

  return (
    <div className="min-h-screen bg-bone">
      {/* Header */}
      <header className="bg-obsidian text-white py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gold rounded-sm flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl">{business?.name}</h1>
              <p className="text-white/60 text-sm">{business?.website}</p>
            </div>
          </div>
          
          <div className="bg-white/10 rounded-sm p-6">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Your Wedding</p>
            <h2 className="font-display text-3xl mb-2">
              {job?.partner1_name} & {job?.partner2_name}
            </h2>
            <div className="flex items-center gap-2 text-gold">
              <Calendar className="w-4 h-4" />
              <span>{format(parseISO(job?.wedding_date), "EEEE, dd MMMM yyyy")}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border border-border/40 w-full flex justify-start overflow-x-auto">
            <TabsTrigger value="overview" data-testid="portal-tab-overview">
              <FileText className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="invoice" data-testid="portal-tab-invoice">
              <Receipt className="w-4 h-4 mr-2" />
              Invoice
            </TabsTrigger>
            <TabsTrigger value="contract" data-testid="portal-tab-contract">
              <FileSignature className="w-4 h-4 mr-2" />
              Contract
            </TabsTrigger>
            <TabsTrigger value="details" data-testid="portal-tab-details">
              <Calendar className="w-4 h-4 mr-2" />
              Your Details
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-6">
              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-border/40">
                  <CardContent className="p-6 text-center">
                    {invoice?.deposit_paid ? (
                      <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    ) : (
                      <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    )}
                    <p className="font-display text-lg text-obsidian">Deposit</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice?.deposit_paid ? "Paid" : `Due ${format(parseISO(invoice?.deposit_due_date), "dd MMM")}`}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-border/40">
                  <CardContent className="p-6 text-center">
                    {contract?.status === "signed" ? (
                      <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    ) : (
                      <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    )}
                    <p className="font-display text-lg text-obsidian">Contract</p>
                    <p className="text-sm text-muted-foreground">
                      {contract?.status === "signed" ? "Signed" : "Awaiting Signature"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-border/40">
                  <CardContent className="p-6 text-center">
                    {booking_form?.is_completed ? (
                      <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    ) : (
                      <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    )}
                    <p className="font-display text-lg text-obsidian">Details</p>
                    <p className="text-sm text-muted-foreground">
                      {booking_form?.is_completed ? "Completed" : "Please Complete"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Package Details */}
              <Card className="bg-white border-border/40">
                <CardHeader>
                  <CardTitle className="font-display text-xl">Your Package</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-display text-lg text-obsidian">{job?.package_name}</h3>
                    </div>
                    <p className="font-display text-2xl text-gold">
                      £{job?.package_price?.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Contact */}
              <Card className="bg-white border-border/40">
                <CardHeader>
                  <CardTitle className="font-display text-xl">Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{business?.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{business?.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{business?.address}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Invoice Tab */}
          <TabsContent value="invoice">
            <Card className="bg-white border-border/40">
              <CardContent className="p-8">
                {/* Invoice Header */}
                <div className="flex justify-between items-start pb-8 border-b border-border">
                  <div>
                    <h2 className="font-display text-2xl text-obsidian mb-2">{business?.name}</h2>
                    <p className="text-sm text-muted-foreground">{business?.address}</p>
                    <p className="text-sm text-muted-foreground">{business?.phone}</p>
                    <p className="text-sm text-muted-foreground">{business?.email}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="font-display text-xl text-gold">INVOICE</h3>
                    <p className="text-sm text-muted-foreground mt-2">{invoice?.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(invoice?.created_at), "dd MMMM yyyy")}
                    </p>
                  </div>
                </div>

                {/* Bill To */}
                <div className="py-8 border-b border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Bill To</p>
                  <p className="font-display text-lg text-obsidian">
                    {invoice?.partner1_name} & {invoice?.partner2_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{invoice?.email}</p>
                </div>

                {/* Items */}
                <div className="py-8 border-b border-border">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left py-2 text-xs uppercase tracking-wider text-muted-foreground">Description</th>
                        <th className="text-right py-2 text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice?.line_items?.map((item, i) => (
                        <tr key={i}>
                          <td className="py-3">{item.description}</td>
                          <td className="py-3 text-right">£{item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border">
                        <td className="py-4 font-display text-lg">Total</td>
                        <td className="py-4 text-right font-display text-xl text-obsidian">
                          £{invoice?.total_amount?.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Payment Schedule */}
                <div className="py-8 border-b border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Payment Schedule</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-sm ${invoice?.deposit_paid ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Deposit (25%)</span>
                        {invoice?.deposit_paid && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <p className="font-display text-lg">£{invoice?.deposit_amount?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {format(parseISO(invoice?.deposit_due_date), "dd MMM yyyy")}
                      </p>
                    </div>
                    <div className={`p-4 rounded-sm ${invoice?.balance_paid ? 'bg-emerald-50' : 'bg-muted/30'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Balance (75%)</span>
                        {invoice?.balance_paid && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <p className="font-display text-lg">£{invoice?.balance_amount?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {format(parseISO(invoice?.balance_due_date), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="py-8">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Bank Transfer Details</p>
                  <div className="bg-obsidian text-white p-6 rounded-sm">
                    <p className="mb-2"><strong>Account Name:</strong> {business?.bank_details?.account_name || business?.name}</p>
                    <p className="mb-2"><strong>Sort Code:</strong> {business?.bank_details?.sort_code || "Please contact for details"}</p>
                    <p><strong>Account Number:</strong> {business?.bank_details?.account_number || "Please contact for details"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Please use <strong>{invoice?.invoice_number}</strong> as your payment reference.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contract Tab */}
          <TabsContent value="contract">
            <Card className="bg-white border-border/40">
              <CardContent className="p-8">
                <div className="prose prose-sm max-w-none mb-8">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {contract?.content}
                  </div>
                </div>

                {contract?.status === "signed" ? (
                  <div className="border-t border-border pt-8">
                    <div className="flex items-center gap-2 text-emerald-600 mb-4">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Contract Signed</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Signed by {contract.signed_by} on {format(parseISO(contract.signed_at), "dd MMMM yyyy")}
                    </p>
                    {contract.signature_data && (
                      <img 
                        src={contract.signature_data} 
                        alt="Signature" 
                        className="h-20 border border-border/40 rounded p-2"
                      />
                    )}
                  </div>
                ) : (
                  <div className="border-t border-border pt-8">
                    <h3 className="font-display text-lg text-obsidian mb-4">Sign Contract</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <Label>Your Full Name</Label>
                        <Input
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          placeholder="Enter your full name"
                          data-testid="signature-name-input"
                        />
                      </div>

                      <div>
                        <Label>Your Signature</Label>
                        <div className="border-2 border-dashed border-border rounded-sm bg-white">
                          <canvas
                            ref={canvasRef}
                            width={600}
                            height={200}
                            className="w-full cursor-crosshair"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            data-testid="signature-canvas"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSignature}
                          className="mt-2"
                        >
                          Clear Signature
                        </Button>
                      </div>

                      <Button
                        onClick={handleSignContract}
                        className="bg-gold hover:bg-gold/90"
                        data-testid="sign-contract-btn"
                      >
                        <FileSignature className="w-4 h-4 mr-2" />
                        Sign Contract
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card className="bg-white border-border/40">
              <CardHeader>
                <CardTitle className="font-display text-xl">Wedding Details</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Please fill in your wedding day details so we can plan accordingly
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Partner 1 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Partner 1 Name</Label>
                    <Input
                      value={bookingForm.partner1_name || ""}
                      onChange={(e) => setBookingForm({ ...bookingForm, partner1_name: e.target.value })}
                      data-testid="booking-partner1-name"
                    />
                  </div>
                  <div>
                    <Label>Partner 1 Email</Label>
                    <Input
                      type="email"
                      value={bookingForm.partner1_email || ""}
                      onChange={(e) => setBookingForm({ ...bookingForm, partner1_email: e.target.value })}
                      data-testid="booking-partner1-email"
                    />
                  </div>
                  <div>
                    <Label>Partner 1 Phone</Label>
                    <Input
                      value={bookingForm.partner1_phone || ""}
                      onChange={(e) => setBookingForm({ ...bookingForm, partner1_phone: e.target.value })}
                      data-testid="booking-partner1-phone"
                    />
                  </div>
                </div>

                {/* Partner 2 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Partner 2 Name</Label>
                    <Input
                      value={bookingForm.partner2_name || ""}
                      onChange={(e) => setBookingForm({ ...bookingForm, partner2_name: e.target.value })}
                      data-testid="booking-partner2-name"
                    />
                  </div>
                  <div>
                    <Label>Partner 2 Email</Label>
                    <Input
                      type="email"
                      value={bookingForm.partner2_email || ""}
                      onChange={(e) => setBookingForm({ ...bookingForm, partner2_email: e.target.value })}
                      data-testid="booking-partner2-email"
                    />
                  </div>
                  <div>
                    <Label>Partner 2 Phone</Label>
                    <Input
                      value={bookingForm.partner2_phone || ""}
                      onChange={(e) => setBookingForm({ ...bookingForm, partner2_phone: e.target.value })}
                      data-testid="booking-partner2-phone"
                    />
                  </div>
                </div>

                {/* Wedding Date & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Wedding Date</Label>
                    <Input
                      type="date"
                      value={bookingForm.wedding_date || ""}
                      onChange={(e) => setBookingForm({ ...bookingForm, wedding_date: e.target.value })}
                      data-testid="booking-wedding-date"
                    />
                  </div>
                  <div>
                    <Label>Ceremony Time</Label>
                    <Input
                      type="time"
                      value={bookingForm.ceremony_time || ""}
                      onChange={(e) => setBookingForm({ ...bookingForm, ceremony_time: e.target.value })}
                      data-testid="booking-ceremony-time"
                    />
                  </div>
                </div>

                {/* Ceremony Venue */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Ceremony Venue</Label>
                    <Input
                      value={bookingForm.ceremony_venue || ""}
                      onChange={(e) => setBookingForm({ ...bookingForm, ceremony_venue: e.target.value })}
                      placeholder="Venue name"
                      data-testid="booking-ceremony-venue"
                    />
                  </div>
                  <div>
                    <Label>Ceremony Address</Label>
                    <Input
                      value={bookingForm.ceremony_address || ""}
                      onChange={(e) => setBookingForm({ ...bookingForm, ceremony_address: e.target.value })}
                      placeholder="Full address"
                      data-testid="booking-ceremony-address"
                    />
                  </div>
                </div>

                {/* Reception Venue */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Reception Venue</Label>
                    <Input
                      value={bookingForm.reception_venue || ""}
                      onChange={(e) => setBookingForm({ ...bookingForm, reception_venue: e.target.value })}
                      placeholder="Venue name (if different)"
                      data-testid="booking-reception-venue"
                    />
                  </div>
                  <div>
                    <Label>Reception Address</Label>
                    <Input
                      value={bookingForm.reception_address || ""}
                      onChange={(e) => setBookingForm({ ...bookingForm, reception_address: e.target.value })}
                      placeholder="Full address"
                      data-testid="booking-reception-address"
                    />
                  </div>
                </div>

                {/* Getting Ready */}
                <div>
                  <Label>Getting Ready Location</Label>
                  <Input
                    value={bookingForm.getting_ready_location || ""}
                    onChange={(e) => setBookingForm({ ...bookingForm, getting_ready_location: e.target.value })}
                    placeholder="Where will you be getting ready?"
                    data-testid="booking-getting-ready"
                  />
                </div>

                {/* Special Requests */}
                <div>
                  <Label>Special Requests / Notes</Label>
                  <Textarea
                    value={bookingForm.special_requests || ""}
                    onChange={(e) => setBookingForm({ ...bookingForm, special_requests: e.target.value })}
                    placeholder="Any special moments you'd like captured, family situations to be aware of, etc."
                    rows={4}
                    data-testid="booking-special-requests"
                  />
                </div>

                <Button
                  onClick={handleSaveBookingForm}
                  disabled={saving}
                  className="bg-obsidian hover:bg-obsidian/90"
                  data-testid="save-booking-form-btn"
                >
                  {saving ? "Saving..." : "Save Details"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-obsidian text-white py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-white/60 text-sm">
            © 2024 {business?.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
