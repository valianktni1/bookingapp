import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { format, parseISO } from "date-fns";
import { 
  Check,
  Calendar,
  MapPin,
  Package,
  Sparkles,
  Phone,
  Mail,
  Globe,
  CreditCard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function QuoteView() {
  const { quoteId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetchQuote();
  }, [quoteId]);

  const fetchQuote = async () => {
    try {
      const response = await axios.get(`${API}/public/quote/${quoteId}`);
      setData(response.data);
      // Pre-select all items from the quote
      const itemIds = response.data.quote.items.map(item => item.package_id);
      setSelectedPackages(itemIds);
    } catch (err) {
      console.error("Error fetching quote:", err);
      setError("Quote not found or has expired");
    } finally {
      setLoading(false);
    }
  };

  const togglePackage = (packageId) => {
    setSelectedPackages(prev => 
      prev.includes(packageId) 
        ? prev.filter(id => id !== packageId)
        : [...prev, packageId]
    );
  };

  const calculateTotal = () => {
    if (!data) return 0;
    return data.quote.items
      .filter(item => selectedPackages.includes(item.package_id))
      .reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  };

  const handleAcceptQuote = async () => {
    if (selectedPackages.length === 0) {
      toast.error("Please select at least one package");
      return;
    }
    
    setAccepting(true);
    try {
      // For now, just show a success message
      // In a full implementation, this would create the job
      toast.success("Quote accepted! Mark will be in touch shortly to confirm your booking.");
      
      // You could redirect to a thank you page or the portal
      // window.location.href = `/portal/${data.quote.id}`;
    } catch (err) {
      console.error("Error accepting quote:", err);
      toast.error("Failed to accept quote. Please try again or contact Mark directly.");
    } finally {
      setAccepting(false);
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
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-lg text-muted-foreground">{error}</p>
            <p className="text-sm mt-2">Please contact Mark at 07712 117357 for assistance.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { quote, lead, business } = data;
  const total = calculateTotal();
  const discount = quote.discount || 0;
  const finalTotal = total - discount;

  return (
    <div className="min-h-screen bg-bone">
      {/* Header */}
      <header className="bg-obsidian text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {business.logo_url && (
                <img 
                  src={business.logo_url} 
                  alt={business.name}
                  className="h-16 w-auto"
                />
              )}
              <div>
                <h1 className="font-display text-2xl">{business.name}</h1>
                <p className="text-white/70 text-sm">Wedding Photography</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Message */}
        <Card className="bg-white border-border/40 shadow-sm mb-8">
          <CardContent className="pt-6">
            <h2 className="font-display text-2xl text-obsidian mb-2">
              Hello {lead.partner1_name} & {lead.partner2_name}! 💍
            </h2>
            <p className="text-muted-foreground">
              Thank you for considering me to capture your special day. Below are all available packages 
              for your wedding. Please <strong>select your preferred package</strong> and any optional add-ons, 
              then click accept to secure your booking.
            </p>
            
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              {lead.wedding_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{format(parseISO(lead.wedding_date), "dd MMMM yyyy")}</span>
                </div>
              )}
              {lead.venue && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{lead.venue}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Package Selection Instructions */}
        <div className="bg-gold/10 border border-gold/30 rounded-sm p-4 mb-6">
          <p className="text-obsidian text-sm">
            <strong>How to book:</strong> Select ONE main package below, add any optional extras you'd like, 
            then click "Accept Quote & Book" at the bottom. Your booking will be confirmed once the £{data?.business?.deposit_amount || 100} deposit is received.
          </p>
        </div>

        {/* Packages */}
        <div className="space-y-6 mb-8">
          <h3 className="font-display text-xl text-obsidian">Select Your Package</h3>
          
          {/* Main Packages */}
          <div className="space-y-4">
            {quote.items.filter(item => item.package_type === "main").map((item) => (
              <Card 
                key={item.package_id}
                className={`bg-white border-2 transition-all cursor-pointer ${
                  selectedPackages.includes(item.package_id) 
                    ? 'border-gold shadow-md' 
                    : 'border-border/40 hover:border-gold/50'
                }`}
                onClick={() => togglePackage(item.package_id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedPackages.includes(item.package_id)
                          ? 'bg-gold border-gold'
                          : 'border-muted-foreground/30'
                      }`}>
                        {selectedPackages.includes(item.package_id) && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-4 h-4 text-gold" />
                          <h4 className="font-display text-lg text-obsidian">{item.name}</h4>
                          <Badge className="bg-gold/10 text-gold border-gold/20">Main Package</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">{item.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-2xl text-obsidian">£{item.price.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add-ons */}
          {quote.items.filter(item => item.package_type === "addon").length > 0 && (
            <>
              <h3 className="font-display text-xl text-obsidian mt-8">Add-ons (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quote.items.filter(item => item.package_type === "addon").map((item) => (
                  <Card 
                    key={item.package_id}
                    className={`bg-white border-2 transition-all cursor-pointer ${
                      selectedPackages.includes(item.package_id) 
                        ? 'border-sage shadow-md' 
                        : 'border-border/40 hover:border-sage/50'
                    }`}
                    onClick={() => togglePackage(item.package_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedPackages.includes(item.package_id)
                              ? 'bg-sage border-sage'
                              : 'border-muted-foreground/30'
                          }`}>
                            {selectedPackages.includes(item.package_id) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-sage" />
                              <h4 className="font-medium text-obsidian">{item.name}</h4>
                            </div>
                            {item.quantity > 1 && (
                              <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                            )}
                          </div>
                        </div>
                        <p className="font-display text-lg text-obsidian">
                          £{(item.price * (item.quantity || 1)).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Summary */}
        <Card className="bg-obsidian text-white mb-8">
          <CardContent className="p-6">
            <h3 className="font-display text-xl mb-4">Your Selection</h3>
            <div className="space-y-2">
              {quote.items
                .filter(item => selectedPackages.includes(item.package_id))
                .map(item => (
                  <div key={item.package_id} className="flex justify-between text-sm">
                    <span>{item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}</span>
                    <span>£{(item.price * (item.quantity || 1)).toLocaleString()}</span>
                  </div>
                ))}
              
              {selectedPackages.length === 0 && (
                <p className="text-white/50 text-sm">No packages selected</p>
              )}
              
              {discount > 0 && (
                <div className="flex justify-between text-gold pt-2 border-t border-white/20">
                  <span>Discount {quote.discount_note ? `(${quote.discount_note})` : ''}</span>
                  <span>-£{discount.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between text-xl font-display pt-4 border-t border-white/20">
                <span>Total</span>
                <span>£{finalTotal.toLocaleString()}</span>
              </div>

              <div className="mt-4 pt-4 border-t border-white/20 space-y-1 text-sm text-white/70">
                <div className="flex justify-between">
                  <span>Deposit (to secure booking)</span>
                  <span>£{business.deposit_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Balance (45 days before wedding)</span>
                  <span>£{(finalTotal - (business.deposit_amount || 100)).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accept Button */}
        <div className="text-center mb-8">
          <Button
            size="lg"
            onClick={handleAcceptQuote}
            disabled={accepting || selectedPackages.length === 0}
            className="bg-gold hover:bg-gold/90 text-white px-12 py-6 text-lg"
            data-testid="accept-quote-btn"
          >
            {accepting ? "Processing..." : "Accept Quote & Book"}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Quote valid until {format(parseISO(quote.valid_until), "dd MMMM yyyy")}
          </p>
        </div>

        {/* Bank Details */}
        <Card className="bg-white border-border/40 shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gold" />
              Bank Transfer Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-obsidian text-white p-4 rounded-sm">
              <p className="mb-2"><strong>Sort Code:</strong> {business.bank_details?.sort_code}</p>
              <p className="mb-2"><strong>Account Number:</strong> {business.bank_details?.account_number}</p>
              <p><strong>Account Name:</strong> {business.bank_details?.account_name}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Please use your names as the payment reference.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="bg-white border-border/40 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-lg">Have Questions?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              I'm here to help! Feel free to get in touch anytime.
            </p>
            <div className="flex flex-wrap gap-4">
              <a 
                href={`tel:${business.phone}`}
                className="flex items-center gap-2 text-obsidian hover:text-gold transition-colors"
              >
                <Phone className="w-4 h-4" />
                {business.phone}
              </a>
              <a 
                href={`mailto:${business.email}`}
                className="flex items-center gap-2 text-obsidian hover:text-gold transition-colors"
              >
                <Mail className="w-4 h-4" />
                {business.email}
              </a>
              <a 
                href={`https://${business.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-obsidian hover:text-gold transition-colors"
              >
                <Globe className="w-4 h-4" />
                {business.website}
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center py-8 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {business.name}. All rights reserved.</p>
          <p className="mt-1">{business.address}</p>
        </footer>
      </div>
    </div>
  );
}
