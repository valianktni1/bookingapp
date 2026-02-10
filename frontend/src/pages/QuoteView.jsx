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
  CreditCard,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function QuoteView() {
  const { quoteId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // IMPORTANT: Start with empty array - client selects their own packages
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [expandedPackages, setExpandedPackages] = useState({});
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

  const fetchQuote = async () => {
    try {
      const response = await axios.get(`${API}/public/quote/${quoteId}`);
      setData(response.data);
      // CRITICAL: Clear any selections - client must choose their own package
      setSelectedPackages([]);
      console.log("Quote loaded - selectedPackages reset to empty array");
    } catch (err) {
      console.error("Error fetching quote:", err);
      setError("Quote not found or has expired");
    } finally {
      setLoading(false);
    }
  };

  // Check if a package is selected
  const isPackageSelected = (packageId) => {
    return selectedPackages.includes(packageId);
  };

  const togglePackage = (packageId) => {
    setSelectedPackages(prev => 
      prev.includes(packageId) 
        ? prev.filter(id => id !== packageId)
        : [...prev, packageId]
    );
  };

  const toggleExpanded = (packageId, e) => {
    e.stopPropagation();
    setExpandedPackages(prev => ({
      ...prev,
      [packageId]: !prev[packageId]
    }));
  };

  const calculateTotal = () => {
    if (!data) return 0;
    return data.quote.items
      .filter(item => isPackageSelected(item.package_id))
      .reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  };

  const handleAcceptQuote = async () => {
    if (selectedPackages.length === 0) {
      toast.error("Please select at least one package");
      return;
    }
    
    setAccepting(true);
    try {
      // Send acceptance to backend - this will create the job and send notification email
      await axios.post(`${API}/public/quote/${quoteId}/accept`, {
        selected_packages: selectedPackages
      });
      
      toast.success("Quote accepted! Mark will be in touch shortly to confirm your booking.");
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
  const finalTotal = Math.max(0, total - (total > 0 ? discount : 0));

  // Parse includes from string to array if needed - handles * bullet points
  const parseIncludes = (item) => {
    if (item.includes && Array.isArray(item.includes)) {
      // Handle array - each item might have * prefix
      return item.includes.map(i => i.replace(/^\*\s*/, '').trim()).filter(i => i);
    }
    if (item.includes && typeof item.includes === 'string') {
      // Split by newline and handle * bullet points
      return item.includes
        .split('\n')
        .map(i => i.replace(/^\*\s*/, '').trim())
        .filter(i => i);
    }
    if (item.description) {
      // Split description by * if it contains them
      if (item.description.includes('*')) {
        return item.description
          .split('*')
          .map(i => i.trim())
          .filter(i => i);
      }
      return [item.description];
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-bone">
      {/* Header */}
      <header className="bg-obsidian text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center md:justify-start gap-4">
            {business.logo_url && (
              <img 
                src={business.logo_url} 
                alt={business.name}
                className="h-20 w-auto"
              />
            )}
            {!business.logo_url && (
              <div>
                <h1 className="font-display text-2xl">{business.name}</h1>
                <p className="text-white/70 text-sm">Wedding Photography</p>
              </div>
            )}
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
            <strong>How to book:</strong> Click on a package to see what's included, then tick the checkbox to select it. 
            Add any optional extras you'd like, then click "Accept Quote & Book" at the bottom. 
            Your booking will be confirmed once the £{business?.deposit_amount || 100} deposit is received.
          </p>
        </div>

        {/* Packages */}
        <div className="space-y-6 mb-8">
          <h3 className="font-display text-xl text-obsidian">Select Your Package</h3>
          
          {/* Main Packages */}
          <div className="space-y-4">
            {quote.items.filter(item => item.package_type === "main").map((item) => {
              const includes = parseIncludes(item);
              const isExpanded = expandedPackages[item.package_id];
              const isSelected = isPackageSelected(item.package_id);
              
              return (
                <Card 
                  key={item.package_id}
                  className={`bg-white border-2 transition-all overflow-hidden ${
                    isSelected 
                      ? 'border-gold shadow-lg' 
                      : 'border-border/40 hover:border-gold/50'
                  }`}
                >
                  {/* Package Header - Clickable to expand */}
                  <div 
                    className="p-6 cursor-pointer"
                    onClick={(e) => toggleExpanded(item.package_id, e)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <div 
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-gold border-gold'
                              : 'border-muted-foreground/30 hover:border-gold'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePackage(item.package_id);
                          }}
                        >
                          {isSelected && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Package className="w-5 h-5 text-gold" />
                            <h4 className="font-display text-xl text-obsidian">{item.name}</h4>
                            <Badge className="bg-gold/10 text-gold border-gold/20">Main Package</Badge>
                          </div>
                          <p className="text-muted-foreground text-sm mt-1">
                            Click to see what's included
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <p className="font-display text-2xl text-obsidian">£{item.price.toLocaleString()}</p>
                        <button className="text-muted-foreground hover:text-obsidian transition-colors">
                          {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expandable Content */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-border/40 pt-4 bg-bone/50">
                      <h5 className="font-semibold text-obsidian mb-3">What's Included:</h5>
                      {includes.length > 0 ? (
                        <ul className="space-y-2">
                          {includes.map((include, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                              <Check className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                              <span>{include}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground text-sm">{item.description || "Contact for full details"}</p>
                      )}
                      
                      {/* Select button inside accordion */}
                      <Button
                        className={`mt-4 ${isSelected ? 'bg-gold hover:bg-gold/90' : 'bg-obsidian hover:bg-obsidian/90'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePackage(item.package_id);
                        }}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Selected
                          </>
                        ) : (
                          'Select This Package'
                        )}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Add-ons */}
          {quote.items.filter(item => item.package_type === "addon").length > 0 && (
            <>
              <h3 className="font-display text-xl text-obsidian mt-8">Add-ons (Optional)</h3>
              <div className="space-y-3">
                {quote.items.filter(item => item.package_type === "addon").map((item) => {
                  const includes = parseIncludes(item);
                  const isExpanded = expandedPackages[item.package_id];
                  const isSelected = isPackageSelected(item.package_id);
                  
                  return (
                    <Card 
                      key={item.package_id}
                      className={`bg-white border-2 transition-all overflow-hidden ${
                        isSelected 
                          ? 'border-sage shadow-md' 
                          : 'border-border/40 hover:border-sage/50'
                      }`}
                    >
                      {/* Add-on Header */}
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={(e) => toggleExpanded(item.package_id, e)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Checkbox */}
                            <div 
                              className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-sage border-sage'
                                  : 'border-muted-foreground/30 hover:border-sage'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePackage(item.package_id);
                              }}
                            >
                              {isSelected && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-sage" />
                                <h4 className="font-medium text-obsidian">{item.name}</h4>
                                {item.quantity > 1 && (
                                  <Badge variant="outline" className="text-xs">x{item.quantity}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">Click for details</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-display text-lg text-obsidian">
                              £{(item.price * (item.quantity || 1)).toLocaleString()}
                            </p>
                            <button className="text-muted-foreground hover:text-obsidian transition-colors">
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expandable Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-border/40 pt-3 bg-bone/50">
                          <h5 className="font-semibold text-obsidian mb-2 text-sm">What's Included:</h5>
                          {includes.length > 0 ? (
                            <ul className="space-y-1">
                              {includes.map((include, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-muted-foreground text-sm">
                                  <Check className="w-3 h-3 text-sage mt-0.5 flex-shrink-0" />
                                  <span>{include}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground text-sm">{item.description || "Additional service"}</p>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
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
                .filter(item => isPackageSelected(item.package_id))
                .map(item => (
                  <div key={item.package_id} className="flex justify-between text-sm">
                    <span>{item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}</span>
                    <span>£{(item.price * (item.quantity || 1)).toLocaleString()}</span>
                  </div>
                ))}
              
              {selectedPackages.length === 0 && (
                <p className="text-white/50 text-sm">No packages selected - please choose a package above</p>
              )}
              
              {discount > 0 && selectedPackages.length > 0 && (
                <div className="flex justify-between text-gold pt-2 border-t border-white/20">
                  <span>Discount {quote.discount_note ? `(${quote.discount_note})` : ''}</span>
                  <span>-£{discount.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between text-xl font-display pt-4 border-t border-white/20">
                <span>Total</span>
                <span>£{finalTotal.toLocaleString()}</span>
              </div>

              {selectedPackages.length > 0 && (
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
              )}
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
