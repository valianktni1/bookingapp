import { useState } from "react";
import axios from "axios";
import { 
  Camera,
  Send,
  Check,
  Calendar,
  Heart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EnquiryForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    partner1_name: "",
    partner2_name: "",
    email: "",
    phone: "",
    wedding_date: "",
    venue: "",
    message: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.partner1_name || !formData.partner2_name || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/enquiry`, formData);
      setSubmitted(true);
      toast.success("Enquiry submitted successfully!");
    } catch (error) {
      console.error("Error submitting enquiry:", error);
      toast.error("Failed to submit enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-white border-border/40 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="font-display text-2xl text-obsidian mb-4">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              Your enquiry has been received. We'll be in touch within 24 hours to discuss your special day.
            </p>
            <Heart className="w-6 h-6 text-gold mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone">
      {/* Header */}
      <header className="bg-obsidian text-white py-12">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gold rounded-sm flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="font-display text-3xl md:text-4xl mb-2">Weddings By Mark</h1>
          <p className="text-white/60">Wedding Photography & Videography</p>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <Card className="bg-white border-border/40 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-display text-2xl text-obsidian">
              Let's Capture Your Story
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Fill in the form below and we'll get back to you within 24 hours
            </p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Your Name *</Label>
                  <Input
                    value={formData.partner1_name}
                    onChange={(e) => setFormData({ ...formData, partner1_name: e.target.value })}
                    placeholder="Your name"
                    required
                    data-testid="enquiry-partner1-name"
                  />
                </div>
                <div>
                  <Label>Partner's Name *</Label>
                  <Input
                    value={formData.partner2_name}
                    onChange={(e) => setFormData({ ...formData, partner2_name: e.target.value })}
                    placeholder="Partner's name"
                    required
                    data-testid="enquiry-partner2-name"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    required
                    data-testid="enquiry-email"
                  />
                </div>
                <div>
                  <Label>Phone Number *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Your phone number"
                    required
                    data-testid="enquiry-phone"
                  />
                </div>
              </div>

              {/* Wedding Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Wedding Date</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={formData.wedding_date}
                      onChange={(e) => setFormData({ ...formData, wedding_date: e.target.value })}
                      data-testid="enquiry-wedding-date"
                    />
                  </div>
                </div>
                <div>
                  <Label>Venue</Label>
                  <Input
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="Wedding venue (if known)"
                    data-testid="enquiry-venue"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <Label>Your Message</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us about your wedding plans, what style of photography you're looking for, or any questions you have..."
                  rows={5}
                  data-testid="enquiry-message"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gold hover:bg-gold/90 h-12 text-sm uppercase tracking-wider"
                data-testid="submit-enquiry-btn"
              >
                {submitting ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Enquiry
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p className="mb-2">Prefer to call? Reach us at <strong>07712 117357</strong></p>
          <p>Email: <strong>mark@perfectweddingsbymark.uk</strong></p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-obsidian text-white py-6 mt-12">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-white/60 text-sm">
            © 2024 Weddings By Mark. Manchester Wedding Photography.
          </p>
        </div>
      </footer>
    </div>
  );
}
