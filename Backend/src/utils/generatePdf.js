const PDFDocument = require("pdfkit");
const fs = require("fs");
const QRCode = require("qrcode");

const format = (val) => `₹${parseFloat(val || 0).toFixed(2)}`;

const generateInvoicePDF = async (invoice, filePath) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const lineHeight = 20;
      const colWidths = [30, 120, 60, 40, 40, 60, 50, 80];
      const tableX = 50;
      let y = 150;

      // ─────── Header ───────
      doc.fontSize(20).text("TAX INVOICE", { align: "center" });
      doc.moveDown(0.5);

      // ─────── Customer Info ───────
      doc.fontSize(12);
      doc.text(`Invoice No: ${invoice.customer.invoiceNo}`);
      doc.text(`Date: ${invoice.customer.date}`);
      doc.text(`Customer: ${invoice.customer.name}`);
      doc.text(`Mobile: ${invoice.customer.mobile}`);
      doc.text(`GST No: ${invoice.customer.gst || "-"}`);
      doc.moveDown();

      y = doc.y;

      // ─────── Table Header ───────
      const headers = ["S.No", "Particular", "HSN", "Qty", "Unit", "Rate", "GST%", "Total"];
      doc.font("Helvetica-Bold");
      let x = tableX;

      // Draw header row background
      doc.rect(tableX, y, colWidths.reduce((a, b) => a + b, 0), lineHeight).fill("#f0f0f0");
      doc.fillColor("black");

      headers.forEach((h, i) => {
        doc
          .fillColor("black")
          .text(h, x + 2, y + 5, { width: colWidths[i] - 4, align: "left" });
        x += colWidths[i];
      });

      doc.moveTo(tableX, y).lineTo(tableX + colWidths.reduce((a, b) => a + b, 0), y).stroke();
      y += lineHeight;

      // ─────── Table Body ───────
      doc.font("Helvetica");
      invoice.products.forEach((item, i) => {
        x = tableX;
        const row = [
          i + 1,
          item.particular,
          item.hsn_code,
          item.quantity,
          item.unit,
          format(item.rate),
          item.gst,
          format(item.priceIncludingGst),
        ];

        row.forEach((val, j) => {
          doc.text(String(val), x + 2, y + 5, {
            width: colWidths[j] - 4,
            align: "left",
          });
          x += colWidths[j];
        });

        // Draw bottom border
        doc
          .moveTo(tableX, y)
          .lineTo(tableX + colWidths.reduce((a, b) => a + b, 0), y)
          .stroke();

        y += lineHeight;
      });

      // Final row bottom border
      doc
        .moveTo(tableX, y)
        .lineTo(tableX + colWidths.reduce((a, b) => a + b, 0), y)
        .stroke();

      doc.moveDown(2);

      // ─────── Summary ───────
      const { summaryData } = invoice;
      const summaryX = doc.page.width - 250;
      const summaryY = y + 30;

      doc.font("Helvetica").fontSize(12);

      const summary = [
        ["Subtotal", format(summaryData.totalWithGst)],
        ["Discount", `${summaryData.discountValue} ${summaryData.discountType}`],
        ["GST", format(summaryData.gstCost)],
        ["CGST", format(summaryData.cgstCost)],
        ["SGST", format(summaryData.sgstCost)],
        ["Transport", format(summaryData.transportAmount)],
        ["Total", format(summaryData.total)],
      ];

      summary.forEach(([label, value], i) => {
        doc.text(label, summaryX, summaryY + i * 18, { align: "left" });
        doc.text(value, summaryX + 120, summaryY + i * 18, { align: "right" });
      });

      // ─────── QR Code ───────
      const qrText = `Invoice No: ${invoice.customer.invoiceNo}\nDate: ${invoice.customer.date}\nTotal: ₹${summaryData.total}`;
      const qrDataURL = await QRCode.toDataURL(qrText);
      const qrImg = qrDataURL.replace(/^data:image\/png;base64,/, "");
      const qrBuffer = Buffer.from(qrImg, "base64");

      doc.image(qrBuffer, 50, summaryY, {
        fit: [100, 100],
        align: "left",
        valign: "bottom",
      });

      doc.end();

      stream.on("finish", resolve);
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = generateInvoicePDF;
