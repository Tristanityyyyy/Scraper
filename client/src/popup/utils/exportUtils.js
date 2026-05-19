import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToCSV(data) {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map((row, i) => ({
      "#": i + 1,
      Name: row.name,
      Rating: row.rating,
      Reviews: row.reviews,
      Category: row.category,
      Address: row.address,
      Phone: row.phone,
      Hours: row.hours,
      Sponsored: row.sponsored,
    }))
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Places");
  XLSX.writeFile(workbook, `google_places_${new Date().toISOString().slice(0, 10)}.csv`, { bookType: "csv" });
}

export function exportToPDF(data) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("Google Places Scraper Results", 14, 16);
  doc.setFontSize(9);
  doc.text(`Scraped: ${new Date().toLocaleString()}  |  Total: ${data.length} items`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [["#", "Name", "Rating", "Category", "Address", "Phone", "Hours", "Sponsored"]],
    body: data.map((row, i) => [
      i + 1, row.name, row.rating ? `${row.rating} (${row.reviews})` : "—",
      row.category, row.address, row.phone, row.hours, row.sponsored,
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [0, 200, 140], textColor: [10, 10, 10], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 250, 248] },
  });

  doc.save(`google_places_${new Date().toISOString().slice(0, 10)}.pdf`);
}