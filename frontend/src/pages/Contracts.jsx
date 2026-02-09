import { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO } from "date-fns";
import { 
  FileSignature,
  Check,
  Clock,
  Send,
  Eye
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  draft: { label: "Draft", class: "bg-muted text-muted-foreground border-border" },
  sent: { label: "Awaiting Signature", class: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  signed: { label: "Signed", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" }
};

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [jobs, setJobs] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const [contractsRes, jobsRes] = await Promise.all([
        axios.get(`${API}/contracts`),
        axios.get(`${API}/jobs`)
      ]);
      
      setContracts(contractsRes.data);
      
      // Create jobs lookup
      const jobsMap = {};
      jobsRes.data.forEach(job => {
        jobsMap[job.id] = job;
      });
      setJobs(jobsMap);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      toast.error("Failed to load contracts");
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-obsidian">Contracts</h1>
        <p className="text-muted-foreground mt-1">Track contract signatures</p>
      </div>

      {/* Contracts List */}
      {contracts.length > 0 ? (
        <div className="grid gap-4">
          {contracts.map((contract, index) => {
            const job = jobs[contract.job_id];
            const status = statusConfig[contract.status] || statusConfig.sent;

            return (
              <Card 
                key={contract.id}
                className="bg-white border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300"
                data-testid={`contract-card-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-display text-lg text-obsidian">
                          {contract.partner1_name} & {contract.partner2_name}
                        </h3>
                        <Badge className={status.class}>
                          {contract.status === "signed" ? (
                            <Check className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {status.label}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Wedding: {format(parseISO(contract.wedding_date), "dd MMMM yyyy")}</p>
                        <p>Created: {format(parseISO(contract.created_at), "dd MMM yyyy")}</p>
                        {contract.signed_at && (
                          <p className="text-emerald-600">
                            Signed: {format(parseISO(contract.signed_at), "dd MMM yyyy")} by {contract.signed_by}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedContract(contract);
                          setShowViewModal(true);
                        }}
                        data-testid={`view-contract-${index}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Contract
                      </Button>
                    </div>
                  </div>

                  {/* Signature Display */}
                  {contract.signature_data && (
                    <div className="mt-4 pt-4 border-t border-border/40">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Signature</p>
                      <img 
                        src={contract.signature_data} 
                        alt="Signature" 
                        className="h-16 object-contain"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white border-border/40">
          <CardContent className="py-16 text-center">
            <FileSignature className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-display text-obsidian mb-2">No contracts yet</p>
            <p className="text-muted-foreground">
              Contracts are created when quotes are accepted
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Contract Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Contract - {selectedContract?.partner1_name} & {selectedContract?.partner2_name}
            </DialogTitle>
          </DialogHeader>

          {selectedContract && (
            <div className="py-4">
              <div className="prose prose-sm max-w-none">
                <div 
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedContract.content.replace(/\n/g, '<br/>') }}
                />
              </div>

              {selectedContract.signature_data && (
                <div className="mt-8 pt-8 border-t border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
                    Signed by {selectedContract.signed_by} on {format(parseISO(selectedContract.signed_at), "dd MMMM yyyy")}
                  </p>
                  <img 
                    src={selectedContract.signature_data} 
                    alt="Signature" 
                    className="h-20 object-contain border border-border/40 rounded p-2"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
