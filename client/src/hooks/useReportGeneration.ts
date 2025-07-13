
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@shared';
import { generatePDF } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';

export const useReportGeneration = () => {
  const { toast } = useToast();

  const downloadReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/reports/health-pdf", {});
      return response.json();
    },
    onSuccess: (data) => {
      generatePDF(data);
      toast({
        title: "Report downloaded",
        description: "Your health report has been downloaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to download the health report. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    downloadReportMutation,
    handleDownloadPDF: () => downloadReportMutation.mutate(),
  };
};
