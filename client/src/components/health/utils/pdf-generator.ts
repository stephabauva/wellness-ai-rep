// @used-by health/hooks
import jsPDF from 'jspdf';

export const generatePDF = (data: any) => {
  const pdf = new jsPDF();
  pdf.text('Health Report', 20, 20);
  pdf.text(JSON.stringify(data, null, 2), 20, 40);
  return pdf;
};