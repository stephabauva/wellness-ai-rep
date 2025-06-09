import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast'; // Standard toast hook
import { apiRequest } from '@/lib/queryClient'; // Assuming this utility exists
import { generatePDF } from '@/lib/pdf-generator'; // PDF generation utility

export function useHealthReport() {
  const { toast } = useToast();

  const downloadReportMutation = useMutation({
    // The mutation function likely fetches data needed for the PDF from an API endpoint
    mutationFn: async () => {
      // This might need to fetch data first, then generate PDF, or fetch a pre-generated PDF
      // For now, assuming '/api/reports/health-pdf' provides data for generatePDF
      const response = await apiRequest('GET', '/api/reports/health-pdf', {}); // Adjust endpoint/payload as needed
      if (!response.ok) { // apiRequest might throw on !response.ok, or handle it like this
          const errorData = await response.json().catch(() => ({ message: "Failed to fetch report data" }));
          throw new Error(errorData.message || "Failed to fetch report data");
      }
      return response.json(); // This data is then passed to generatePDF
    },
    onSuccess: (data) => {
      try {
        generatePDF(data); // generatePDF should handle the actual PDF creation/download
        toast({
          title: "Report Downloaded",
          description: "Your health report PDF has been generated and downloaded.",
        });
      } catch (error) {
        console.error("PDF generation error:", error);
        toast({
          title: "PDF Generation Failed",
          description: "There was an error generating your PDF report. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Download Error",
        description: error.message || "Failed to download the health report. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    downloadHealthReport: downloadReportMutation.mutate,
    isDownloadingReport: downloadReportMutation.isPending,
    reportDownloadError: downloadReportMutation.error,
  };
}
