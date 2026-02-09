import { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO } from "date-fns";
import { 
  Users, 
  Briefcase, 
  PoundSterling, 
  Calendar,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      title: "New Leads",
      value: stats?.new_leads || 0,
      icon: Users,
      color: "bg-sage/10 text-sage",
      action: () => navigate("/leads")
    },
    {
      title: "Active Jobs",
      value: stats?.total_jobs || 0,
      icon: Briefcase,
      color: "bg-gold/10 text-gold",
      action: () => navigate("/jobs")
    },
    {
      title: "Total Invoiced",
      value: `£${(stats?.total_invoiced || 0).toLocaleString()}`,
      icon: PoundSterling,
      color: "bg-emerald-500/10 text-emerald-600",
      action: () => navigate("/invoices")
    },
    {
      title: "Outstanding",
      value: `£${(stats?.outstanding || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: "bg-amber-500/10 text-amber-600",
      action: () => navigate("/invoices")
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl lg:text-4xl text-obsidian">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back, Mark</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.title} 
              className="bg-white border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
              onClick={stat.action}
              data-testid={`stat-card-${index}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      {stat.title}
                    </p>
                    <p className="text-2xl lg:text-3xl font-display font-semibold text-obsidian">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-sm flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upcoming Weddings */}
      <Card className="bg-white border-border/40 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="font-display text-xl text-obsidian">
            Upcoming Weddings
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/jobs")}
            className="text-gold hover:text-gold/80"
            data-testid="view-all-jobs-btn"
          >
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {stats?.upcoming_weddings?.length > 0 ? (
            <div className="space-y-4">
              {stats.upcoming_weddings.map((job, index) => (
                <div 
                  key={job.id}
                  className="flex items-center justify-between p-4 bg-bone rounded-sm hover:bg-muted/50 transition-colors duration-200"
                  data-testid={`upcoming-wedding-${index}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gold/10 rounded-sm flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <p className="font-medium text-obsidian">
                        {job.partner1_name} & {job.partner2_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {job.venue || "Venue TBC"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-obsidian">
                      {format(parseISO(job.wedding_date), "dd MMM yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {job.package_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No upcoming weddings</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="bg-obsidian text-white border-0 shadow-lg cursor-pointer hover:bg-obsidian/90 transition-colors duration-200"
          onClick={() => navigate("/leads")}
          data-testid="quick-action-leads"
        >
          <CardContent className="p-6">
            <Users className="w-8 h-8 mb-4 text-gold" />
            <h3 className="font-display text-lg mb-2">View Leads</h3>
            <p className="text-white/60 text-sm">
              {stats?.new_leads || 0} new enquiries waiting
            </p>
          </CardContent>
        </Card>

        <Card 
          className="bg-white border-border/40 shadow-sm cursor-pointer hover:shadow-md transition-shadow duration-200"
          onClick={() => navigate("/quotes")}
          data-testid="quick-action-quotes"
        >
          <CardContent className="p-6">
            <Briefcase className="w-8 h-8 mb-4 text-sage" />
            <h3 className="font-display text-lg text-obsidian mb-2">Send Quote</h3>
            <p className="text-muted-foreground text-sm">
              Create and send a new quote
            </p>
          </CardContent>
        </Card>

        <Card 
          className="bg-white border-border/40 shadow-sm cursor-pointer hover:shadow-md transition-shadow duration-200"
          onClick={() => navigate("/settings")}
          data-testid="quick-action-settings"
        >
          <CardContent className="p-6">
            <PoundSterling className="w-8 h-8 mb-4 text-gold" />
            <h3 className="font-display text-lg text-obsidian mb-2">Bank Details</h3>
            <p className="text-muted-foreground text-sm">
              Update payment information
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
