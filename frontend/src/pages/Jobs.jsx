import { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO, differenceInDays } from "date-fns";
import { 
  Calendar,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API}/jobs`);
      setJobs(response.data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const copyPortalLink = (token) => {
    const link = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(token);
    toast.success("Portal link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDaysUntil = (dateStr) => {
    const days = differenceInDays(parseISO(dateStr), new Date());
    if (days < 0) return "Past";
    if (days === 0) return "Today!";
    if (days === 1) return "Tomorrow";
    return `${days} days`;
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
        <h1 className="font-display text-3xl text-obsidian">Jobs</h1>
        <p className="text-muted-foreground mt-1">Your booked weddings</p>
      </div>

      {/* Jobs List */}
      {jobs.length > 0 ? (
        <div className="grid gap-6">
          {jobs.map((job, index) => (
            <Card 
              key={job.id}
              className="bg-white border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300"
              data-testid={`job-card-${index}`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="font-display text-xl text-obsidian">
                        {job.partner1_name} & {job.partner2_name}
                      </h3>
                      <Badge className="bg-gold/10 text-gold border-gold/20">
                        {job.package_name}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{format(parseISO(job.wedding_date), "EEEE, dd MMMM yyyy")}</span>
                      </div>
                      {job.venue && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{job.venue}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{job.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{job.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Days Until & Actions */}
                  <div className="flex flex-col items-end gap-4">
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        Wedding In
                      </p>
                      <p className="font-display text-2xl text-gold">
                        {getDaysUntil(job.wedding_date)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyPortalLink(job.portal_token)}
                        data-testid={`copy-portal-link-${index}`}
                      >
                        {copiedId === job.portal_token ? (
                          <Check className="w-4 h-4 mr-1" />
                        ) : (
                          <Copy className="w-4 h-4 mr-1" />
                        )}
                        Copy Portal Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/portal/${job.portal_token}`, '_blank')}
                        data-testid={`view-portal-${index}`}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Portal
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Package Price */}
                <div className="mt-6 pt-6 border-t border-border/40 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Package Value</span>
                  <span className="font-display text-xl text-obsidian">
                    £{job.package_price.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white border-border/40">
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-display text-obsidian mb-2">No jobs yet</p>
            <p className="text-muted-foreground">
              Jobs are created when clients accept quotes
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
