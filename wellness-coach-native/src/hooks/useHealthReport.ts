import { useMutation } from '@tanstack/react-query';
import { useToast } from './use-toast'; // Adjusted path
// TODO: RN-Adapt - `apiRequest` needs to be replaced with an RN-compatible API calling utility
// import { apiRequest } from '@/lib/queryClient'; // This was a PWA specific utility
// import { API_CONFIG } from '../config/api'; // No longer needed directly
import { getFromApi } from '../services/apiClient'; // Import apiClient function

// TODO: RN-Adapt - `generatePDF` needs a React Native PDF generation solution (e.g., expo-print, react-native-pdf).
// import { generatePDF } from '@/lib/pdf-generator';

// Placeholder for generatePDF function if not immediately available
const generatePDF_placeholder = (data: any) => {
  console.warn("generatePDF is a placeholder and needs to be implemented for React Native.", data);
  // In a real scenario, this would interact with a library like react-native-fs to save the PDF
  // or use a sharing intent.
  alert("PDF generation is not yet implemented in RN.");
};


export function useHealthReport() {
  const { toast } = useToast();

  const downloadReportMutation = useMutation({
    mutationFn: async () => {
      // This might fetch data for PDF or a pre-generated PDF URL.
      return getFromApi<any>('reports/health-pdf'); // Use getFromApi, specify expected response type if known
    },
    onSuccess: (data) => {
      try {
        // generatePDF(data); // TODO: RN-Adapt - Use actual RN PDF generation
        generatePDF_placeholder(data);
        toast({
          title: "Report Downloaded (Placeholder)",
          description: "Your health report PDF generation has been simulated.",
        });
      } catch (error) {
        console.error("PDF generation error (RN context):", error);
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
    // TODO: RN-Adapt - error object might need specific typing.
    reportDownloadError: downloadReportMutation.error as Error | null,
  };
}
