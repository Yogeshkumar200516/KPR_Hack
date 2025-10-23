import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { toWords } from "number-to-words";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

// Helper to form a full logo URL if company_logo is just a file name:
const getFullLogoUrl = (filename) => {
  if (!filename) return null;
  return filename.startsWith("http")
    ? filename
    : `${API_BASE_URL}/uploads/logos/${filename}`;
};

// Helper for robust image loading (returns promise that resolves with a dataURL)
const fetchLogoDataUrl = async (logoUrl) => {
  if (!logoUrl) return null;
  try {
    const resp = await fetch(logoUrl, { mode: "cors" });
    if (!resp.ok) throw new Error("Image fetch failed");
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Failed to fetch logo", e);
    return null;
  }
};

// Helper to wrap text into multiple lines within max width
function splitTextToLines(doc, text, maxWidth, fontSize) {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text, maxWidth);
}

/**
 * Generate Invoice PDF with E-Way Bill and optionally send to backend
 * @param {Object} invoice - Invoice data
 * @param {Boolean} sendEmail - Whether to send email
 * @param {String} token - Auth token for tenant
 */
export const sendInvoicePDF = async (invoice, sendEmail = false, token) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Format number to INR
  const format = (value) =>
    Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const numberToWords = (num) =>
    `${toWords(parseFloat(num || 0)).replace(/^\w/, (c) => c.toUpperCase())} Rupees Only`;

  try {
    // 1️⃣ Fetch company info securely
    const response = await axios.get(`${API_BASE_URL}/api/company/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = response.data;
    if (!data || Object.keys(data).length === 0) {
      alert("Company information not found.");
      return { success: false, message: "Company info missing" };
    }

    const companyInfo = {
      name: data.company_name || "Company Name",
      address: data.address || "No address provided",
      gstNumber: data.gst_no || "GST not available",
      pan: data.pan_no || "PAN not available",
      mobile: `${data.cell_no1 || ""}${data.cell_no2 ? ", " + data.cell_no2 : ""}`,
      bankName: data.bank_name || "Bank name",
      accountNo: data.account_number || "Account No",
      ifsc: data.ifsc_code || "IFSC",
      branch: data.branch_name || "Branch",
      logoUrl: getFullLogoUrl(data.company_logo),
    };

    // 2️⃣ Fetch company logo data URL if available
    const logoDataUrl = companyInfo.logoUrl
      ? await fetchLogoDataUrl(companyInfo.logoUrl)
      : null;

    // 3️⃣ Generate PDF content - PAGE 1: Main Invoice
    await drawInvoicePage(doc, invoice, companyInfo, logoDataUrl, pageWidth, pageHeight, format, numberToWords);

    // 4️⃣ Generate PDF content - PAGE 2: E-Way Bill
    await drawEwayBillPage(doc, invoice, companyInfo, logoDataUrl, pageWidth, pageHeight, format, numberToWords);

    // 5️⃣ Convert PDF to Base64 string
    const pdfBase64 = doc.output("datauristring").split(",")[1];

    // 6️⃣ If only PDF blob is needed
    if (!sendEmail) {
      const blob = new Blob([doc.output("arraybuffer")], {
        type: "application/pdf",
      });
      return { success: true, message: "PDF Blob generated successfully.", blob };
    }

    // 7️⃣ Send PDF to backend for emailing
    const sendRes = await axios.post(
      `${API_BASE_URL}/api/send/send-invoice`,
      {
        invoiceNumber: invoice.invoice_number,
        customerEmail: invoice.customer_email,
        pdfBase64,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("✅ Send Invoice API response:", sendRes.data);
    return {
      success: sendRes.data?.success || false,
      message: sendRes.data?.message || "Unknown server response",
    };
  } catch (err) {
    console.error("❌ Sending failed:", err);
    return {
      success: false,
      message: err?.response?.data?.message || err.message || "Unknown error",
    };
  }
};

/**
 * PAGE 1: Main Invoice
 */
async function drawInvoicePage(doc, invoice, companyInfo, logoDataUrl, pageWidth, pageHeight, format, numberToWords) {
  const topMargin = 14;
  const leftMargin = 14;
  const rightMargin = 14;
  let headerHeight = 0;

  // Draw logo box and logo image
  const logoBoxW = 22;
  const logoBoxH = 22;
  const logoBoxX = leftMargin;
  const logoBoxY = topMargin;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 0, 0, "D");

  if (logoDataUrl) {
    const img = new window.Image();
    img.src = logoDataUrl;
    await new Promise((resolve) => {
      img.onload = () => {
        const wr = logoBoxW / img.width;
        const hr = logoBoxH / img.height;
        const ratio = Math.min(wr, hr);
        const imgW = img.width * ratio;
        const imgH = img.height * ratio;
        const imgX = logoBoxX + (logoBoxW - imgW) / 2;
        const imgY = logoBoxY + (logoBoxH - imgH) / 2;
        doc.addImage(logoDataUrl, "PNG", imgX, imgY, imgW, imgH);
        resolve();
      };
      img.onerror = resolve;
    });
  }

  // Company name/address (centered and wrapped)
  const titleFont = 14;
  const infoFont = 10;
  const maxInfoWidth = pageWidth - leftMargin - rightMargin - logoBoxW - 8;
  let infoStartY = topMargin + 4;
  const addressLines = splitTextToLines(doc, companyInfo.address, maxInfoWidth, infoFont);
  let companyInfoLines = [
    { text: companyInfo.name, font: titleFont, bold: true },
    ...addressLines.map((line) => ({
      text: line,
      font: infoFont,
      bold: false,
    })),
  ];

  let dy = 0;
  companyInfoLines.forEach((line) => {
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setFontSize(line.font);
    doc.text(line.text, pageWidth / 2 + logoBoxW / 2, infoStartY + dy, {
      align: "center",
      maxWidth: maxInfoWidth,
    });
    dy += line.font * 0.5;
  });

  // Print GST and Mobile side by side
  const gstText = `GST: ${companyInfo.gstNumber}`;
  const mobileText = `Mobile: ${companyInfo.mobile}`;
  const gstMobileY = infoStartY + dy + 2;
  const leftX = logoBoxX + logoBoxW + 8;
  const rightX = pageWidth - rightMargin;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(infoFont);
  doc.text(gstText, leftX, gstMobileY, { align: "left" });
  doc.text(mobileText, rightX, gstMobileY, { align: "right" });
  dy += infoFont * 0.7;
  headerHeight = Math.max(logoBoxH, dy + 1);
  const afterHeaderY = topMargin + headerHeight + 2;

  // Horizontal line
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.1);
  doc.line(10, afterHeaderY, pageWidth - 10, afterHeaderY);

  // Content Start Y
  const contentStartY = afterHeaderY + 8;

  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Tax Invoice", pageWidth / 2, contentStartY, { align: "center" });

  // QR code
  try {
    const qrData = invoice.qr_string?.trim() || "https://example.com";
    const qrImage = await QRCode.toDataURL(qrData, { margin: 0, width: 80 });
    doc.setFontSize(10);
    doc.text("e-Invoice", 192, contentStartY + 2, { align: "right" });
    doc.addImage(qrImage, "PNG", 175, contentStartY + 7, 20, 20);
  } catch (err) {
    console.warn("QR Code generation failed:", err);
  }

  // IRN section
  const labelX = 14,
    valueX = 35,
    irnYStart = contentStartY + 15,
    lineHeight = 5;
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text("IRN:", labelX, irnYStart);
  doc.text(invoice.irn?.trim() || "-", valueX, irnYStart);
  doc.text("Ack No:", labelX, irnYStart + lineHeight);
  doc.text(invoice.ack_number?.trim() || "-", valueX, irnYStart + lineHeight);
  doc.text("Ack Date:", labelX, irnYStart + lineHeight * 2);
  doc.text(invoice.ack_date?.trim() || "-", valueX, irnYStart + lineHeight * 2);

  // Company & Invoice Table
  const firstTableStartY = irnYStart + lineHeight * 2 + 4;
  const availableWidth = pageWidth - leftMargin - rightMargin;
  const colWidth = availableWidth / 2;

  autoTable(doc, {
    startY: firstTableStartY,
    margin: { left: leftMargin, right: rightMargin },
    body: [
      [
        {
          content: companyInfo.name,
          colSpan: 2,
          styles: { fontStyle: "bold", fontSize: 10 },
        },
      ],
      [
        {
          content: `${invoice.billing_address_address || "-"}
GST No: ${invoice.billing_address_gst_no || "-"}
PAN: ${invoice.billing_address_pan_no || "-"}
Mobile: ${
            [
              invoice.billing_address_cell_no1,
              invoice.billing_address_cell_no2,
            ]
              .filter(Boolean)
              .join(", ") || "-"
          }`,
          styles: { fontSize: 10, valign: "top" },
        },
        {
          content: `Invoice No: ${invoice.invoice_number || "-"}  
e-Way Bill No: ${invoice.eway_bill_no || "-"}  
Payment Type: ${invoice.payment_type || "-"}  
Transaction Type: ${invoice.transaction_type || "-"} 
Email: ${invoice.billing_address_email || "-"}  
Date: ${
            invoice.invoice_date
              ? dayjs.utc(invoice.created_at).local().format("DD-MM-YYYY  hh:mm A")
              : "-"
          }`,
          styles: { fontSize: 10, valign: "top" },
        },
      ],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: colWidth + 1 },
      1: { cellWidth: colWidth },
    },
    tableLineColor: 100,
    tableLineWidth: 0.4,
  });

  // Buyer/Consignee Table
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 4,
    margin: { left: 14, right: 14 },
    body: [
      [
        { content: "Buyer (Bill To):", styles: { fontStyle: "bold" } },
        { content: "Consignee (Ship To):", styles: { fontStyle: "bold" } },
      ],
      [
        {
          content: `${invoice.customer_name || ""}

${invoice.customer_address || ""}
State: ${invoice.customer_state || ""}, Code: ${invoice.customer_pincode || ""}
Mobile: ${invoice.customer_mobile || ""}
GST No: ${invoice.customer_gst_number || ""}
Place of Supply: ${invoice.place_of_supply || ""}`,
          styles: { fontSize: 10 },
        },
        {
          content: `${invoice.consignee_name || ""}

${invoice.consignee_address || ""}
State: ${invoice.consignee_state || ""}, Code: ${invoice.consignee_pincode || ""}
Mobile: ${invoice.consignee_mobile || ""}
GST No: ${invoice.consignee_gst_number || ""}
Place of Supply: ${invoice.consignee_place_of_supply || ""}`,
          styles: { fontSize: 10 },
        },
      ],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    tableLineColor: 100,
    tableLineWidth: 0.4,
    columnStyles: {
      0: { cellWidth: 92 },
      1: { cellWidth: 95 },
    },
  });

  // Products Table
  const headers = [
    ["S.N", "Description", "HSN", "Qty", "Discount(%)", "Rate", "Per", "Amount"],
  ];
  const data = (invoice.items || []).map((item, i) => [
    i + 1,
    item.product_name,
    item.hsn_code,
    `${item.quantity} ${item.unit || ""}`,
    parseFloat(item.discount || 0).toFixed(2),
    parseFloat(item.rate || 0).toFixed(2),
    item.unit || "-",
    parseFloat(item.total_with_gst || 0).toFixed(2),
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 4,
    head: headers,
    body: data,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2.5 },
    headStyles: {
      fillColor: [220, 220, 220],
      fontStyle: "bold",
      textColor: "#313030",
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 47 },
      2: { cellWidth: 16 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 25, halign: "right" },
      6: { cellWidth: 15, halign: "center" },
      7: { cellWidth: 28, halign: "right", fontStyle: "bold" },
    },
  });

  // Summary Table
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 2,
    margin: { left: 14, right: 14 },
    body: [
      new Array(6).fill({ content: "" }).concat([
        {
          content: "Taxable Value",
          styles: { fontStyle: "bold", halign: "right" },
        },
        { content: format(invoice.subtotal), styles: { halign: "right" } },
      ]),
      new Array(6).fill({ content: "" }).concat([
        {
          content: "Central Tax (9%)",
          styles: { fontStyle: "bold", halign: "right" },
        },
        { content: format(invoice.cgst_amount), styles: { halign: "right" } },
      ]),
      new Array(6).fill({ content: "" }).concat([
        {
          content: "State Tax (9%)",
          styles: { fontStyle: "bold", halign: "right" },
        },
        { content: format(invoice.sgst_amount), styles: { halign: "right" } },
      ]),
      new Array(6).fill({ content: "" }).concat([
        {
          content: "Total GST",
          styles: { fontStyle: "bold", halign: "right" },
        },
        {
          content: format(+invoice.cgst_amount + +invoice.sgst_amount),
          styles: { halign: "right" },
        },
      ]),
      new Array(6).fill({ content: "" }).concat([
        {
          content: "Transport Charges",
          styles: { fontStyle: "bold", halign: "right" },
        },
        {
          content: format(invoice.transport_charge),
          styles: { halign: "right" },
        },
      ]),
      new Array(6).fill({ content: "" }).concat([
        {
          content: "Total Amount",
          styles: { fontStyle: "bold", halign: "right" },
        },
        {
          content: format(invoice.total_amount),
          styles: { halign: "right" },
        },
      ]),
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      6: { cellWidth: 60 },
      7: { cellWidth: 35 },
    },
    tableLineColor: 100,
    tableLineWidth: 0.4,
  });

  // Amount in Words
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 2,
    margin: { left: 14, right: 14 },
    body: [
      [
        {
          content: `Amount Chargeable (in words): INR ${numberToWords(
            invoice.total_amount
          )}`,
          colSpan: 10,
          styles: {
            fontStyle: "bold",
            halign: "right",
            textColor: "#313030",
          },
        },
      ],
      [
        {
          content: `Tax Amount (in words): INR ${numberToWords(
            (+invoice.cgst_amount || 0) + (+invoice.sgst_amount || 0)
          )}`,
          colSpan: 10,
          styles: { halign: "right", textColor: "#313030" },
        },
      ],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2 },
    tableLineColor: 100,
    tableLineWidth: 0.4,
  });

  // Bank Details Section
  const sectionWidth = pageWidth - 28;
  let bankY = doc.lastAutoTable.finalY + 4;
  const bankHeight = 7 * 5 + 8;
  if (bankY + bankHeight > pageHeight - 30) {
    doc.addPage();
    bankY = 20;
  }

  autoTable(doc, {
    startY: bankY,
    margin: { left: 14, right: 14 },
    body: [
      [
        {
          content: `Company's Bank Details\n\nA/c Name : ${invoice.billing_address_account_name}\nBank Name : ${invoice.billing_address_bank_name}\nA/c No : ${invoice.billing_address_account_number}\nBranch : ${invoice.billing_address_branch_name}\nIFSC Code : ${invoice.billing_address_ifsc_code}`,
          styles: {
            fontSize: 10,
            halign: "left",
            fontStyle: "bold",
            lineWidth: 0.2,
            lineColor: [180, 180, 180],
            fillColor: [245, 245, 245],
            textColor: [50, 50, 50],
            cellPadding: 4,
          },
        },
      ],
    ],
    columnStyles: {
      0: { cellWidth: sectionWidth },
    },
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2 },
  });

  // Declaration Section
  let declarationY = doc.lastAutoTable.finalY + 4;
  const declarationHeight = 7 * 5 + 8;
  if (declarationY + declarationHeight > pageHeight - 30) {
    doc.addPage();
    declarationY = 20;
  }

  autoTable(doc, {
    startY: declarationY,
    margin: { left: 14, right: 14 },
    body: [
      [
        {
          content: `Declaration:\n\nWe declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\nGoods once sold will not be taken back or exchanged.\n\nSubject to Indian Jurisdiction only.`,
          styles: {
            fontSize: 10,
            halign: "left",
            fontStyle: "bold",
            lineWidth: 0.2,
            lineColor: [180, 180, 180],
            fillColor: [255, 255, 255],
            textColor: [60, 60, 60],
            cellPadding: 4,
          },
        },
      ],
    ],
    columnStyles: {
      0: { cellWidth: sectionWidth },
    },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
  });

  // Signature Box
  let signatureY = doc.lastAutoTable.finalY + 10;
  const boxWidth = 80;
  const boxHeight = 35;
  const boxX = pageWidth - 14 - boxWidth;
  if (signatureY + boxHeight > pageHeight * 0.7) {
    doc.addPage();
    signatureY = 20;
  }

  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.2);
  doc.roundedRect(boxX, signatureY, boxWidth, boxHeight, 0, 0);
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text(`For ${companyInfo.name}`, boxX + boxWidth / 2, signatureY + 10, {
    align: "center",
  });
  doc.setDrawColor(180);
  doc.line(boxX + 10, signatureY + 22, boxX + boxWidth - 10, signatureY + 22);
  doc.text("Authorized Signatory", boxX + boxWidth / 2, signatureY + 30, {
    align: "center",
  });

  // Add page borders and footer
  addPageBorders(doc, pageWidth, pageHeight, invoice);
}

/**
 * PAGE 2: E-Way Bill
 */
async function drawEwayBillPage(doc, invoice, companyInfo, logoDataUrl, pageWidth, pageHeight, format, numberToWords) {
  doc.addPage();

  const topMargin = 14;
  const leftMargin = 14;
  const rightMargin = 14;

  // Logo
  const logoBoxW = 22;
  const logoBoxH = 22;
  const logoBoxX = leftMargin;
  const logoBoxY = topMargin;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 0, 0, "D");

  if (logoDataUrl) {
    const img = new window.Image();
    img.src = logoDataUrl;
    await new Promise((resolve) => {
      img.onload = () => {
        const wr = logoBoxW / img.width;
        const hr = logoBoxH / img.height;
        const ratio = Math.min(wr, hr);
        const imgW = img.width * ratio;
        const imgH = img.height * ratio;
        const imgX = logoBoxX + (logoBoxW - imgW) / 2;
        const imgY = logoBoxY + (logoBoxH - imgH) / 2;
        doc.addImage(logoDataUrl, "PNG", imgX, imgY, imgW, imgH);
        resolve();
      };
      img.onerror = resolve;
    });
  }

  // Company Info
  const titleFont = 14;
  const infoFont = 10;
  const maxInfoWidth = pageWidth - leftMargin - rightMargin - logoBoxW - 8;
  let infoStartY = topMargin + 4;
  const addressLines = splitTextToLines(doc, companyInfo.address, maxInfoWidth, infoFont);
  const companyInfoLines = [
    { text: companyInfo.name, font: titleFont, bold: true },
    ...addressLines.map((line) => ({
      text: line,
      font: infoFont,
      bold: false,
    })),
  ];

  let dy = 0;
  companyInfoLines.forEach((line) => {
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setFontSize(line.font);
    doc.text(line.text, pageWidth / 2 + logoBoxW / 2, infoStartY + dy, {
      align: "center",
      maxWidth: maxInfoWidth,
    });
    dy += line.font * 0.5;
  });

  const gstText = `GST: ${companyInfo.gstNumber}`;
  const mobileText = `Mobile: ${companyInfo.mobile}`;
  const gstMobileY = infoStartY + dy + 2;
  const leftX = logoBoxX + logoBoxW + 8;
  const rightX = pageWidth - rightMargin;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(infoFont);
  doc.text(gstText, leftX, gstMobileY, { align: "left" });
  doc.text(mobileText, rightX, gstMobileY, { align: "right" });
  dy += infoFont * 0.7;
  const headerHeight = Math.max(logoBoxH, dy + 1);
  const afterHeaderY = topMargin + headerHeight + 2;

  // Divider
  doc.setDrawColor(80, 80, 80);
  doc.line(10, afterHeaderY, pageWidth - 10, afterHeaderY);

  // Title
  const contentStartY = afterHeaderY + 8;
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("E-Way Bill", pageWidth / 2, contentStartY, { align: "center" });

  // QR Code
  try {
    const qrData = invoice.qr_string?.trim() || "https://example.com";
    const qrImage = await QRCode.toDataURL(qrData, { margin: 0, width: 80 });
    doc.setFontSize(10);
    doc.text("e-Invoice", 192, contentStartY + 2, { align: "right" });
    doc.addImage(qrImage, "PNG", 175, contentStartY + 7, 20, 20);
  } catch (err) {
    console.warn("QR Code generation failed:", err);
  }

  // IRN Details
  const labelX = 14,
    valueX = 35,
    irnYStart = contentStartY + 15,
    lineHeight = 5;
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text("IRN:", labelX, irnYStart);
  doc.text(invoice.irn?.trim() || "-", valueX, irnYStart);
  doc.text("Ack No:", labelX, irnYStart + lineHeight);
  doc.text(invoice.ack_number?.trim() || "-", valueX, irnYStart + lineHeight);
  doc.text("Ack Date:", labelX, irnYStart + lineHeight * 2);
  doc.text(invoice.ack_date?.trim() || "-", valueX, irnYStart + lineHeight * 2);

  // Transport Details Table
  const firstTableStartY = irnYStart + lineHeight * 2 + 4;
  autoTable(doc, {
    startY: firstTableStartY,
    margin: { left: 14, right: 14 },
    body: [
      [
        {
          content: "Transport Details",
          colSpan: 2,
          styles: { fontStyle: "bold", fontSize: 10 },
        },
      ],
      [
        {
          content: `Transporter : ${invoice.transport_name || "-"}
GST No: ${invoice.transporter_gst_number || "-"}
Distance: ${invoice.transport_distance || "-"}
Vehicle No: ${invoice.consignee_vehicle_number || "-"}
Supply Type: ${invoice.supply_type || "-"}
Document Type: ${invoice.document_type || "-"}
Payment Type: ${invoice.payment_type || "-"}`,
          styles: { fontSize: 10 },
        },
        {
          content: `Invoice No: ${invoice.invoice_number || "-"}
e-Way Bill No: ${invoice.eway_bill_no || "-"}
Valid Upto: ${invoice.eway_valid_upto || "-"}
Distance: ${invoice.transport_distance || "-"} Km
Transport Mode: ${invoice.transport_mode || "-"}
Transaction Type: ${invoice.transaction_type || "-"}
Value of Goods: ${invoice.total_amount || "-"} Rupees`,
          styles: { fontSize: 10 },
        },
      ],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 92 }, 1: { cellWidth: 95 } },
  });

  // From & To Table
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 4,
    margin: { left: 14, right: 14 },
    body: [
      [
        { content: "From:", styles: { fontStyle: "bold" } },
        { content: "To (Ship To):", styles: { fontStyle: "bold" } },
      ],
      [
        {
          content: `${companyInfo.name || ""}

${invoice.billing_address_address || ""}
PAN No: ${invoice.billing_address_pan_no || ""}
GST No: ${invoice.billing_address_gst_no || ""}
Mobile: ${
            [
              invoice.billing_address_cell_no1,
              invoice.billing_address_cell_no2,
            ]
              .filter(Boolean)
              .join(", ") || "-"
          }`,
        },
        {
          content: `${invoice.consignee_name || ""}

${invoice.consignee_address || ""}
State: ${invoice.consignee_state || ""}, Code: ${invoice.consignee_pincode || ""}
Mobile: ${invoice.consignee_mobile || ""}
GST No: ${invoice.consignee_gst_number || ""}
Vehicle No: ${invoice.consignee_vehicle_number || ""}
Place of Supply: ${invoice.consignee_place_of_supply || ""}`,
        },
      ],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 92 }, 1: { cellWidth: 95 } },
  });

  // Products Table
  const headers = [
    ["S.N", "Description", "HSN", "Qty", "Disc(%)", "Rate", "Per", "Amount"],
  ];
  const data = (invoice.items || []).map((item, i) => [
    i + 1,
    item.product_name,
    item.hsn_code,
    `${item.quantity} ${item.unit || ""}`,
    parseFloat(item.discount || 0).toFixed(2),
    parseFloat(item.rate || 0).toFixed(2),
    item.unit || "-",
    parseFloat(item.total_with_gst || 0).toFixed(2),
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 4,
    head: headers,
    body: data,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2.5 },
    headStyles: { fillColor: [220, 220, 220], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 45 },
      2: { cellWidth: 23 },
      3: { cellWidth: 18 },
      4: { cellWidth: 18, halign: "right" },
      5: { cellWidth: 25, halign: "right" },
      6: { cellWidth: 15, halign: "center" },
      7: { cellWidth: 28, halign: "right", fontStyle: "bold" },
    },
  });

  // Summary Table
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 2,
    margin: { left: 14, right: 14 },
    body: [
      new Array(6).fill({ content: "" }).concat([
        {
          content: "Taxable Value",
          styles: { fontStyle: "bold", halign: "right" },
        },
        { content: format(invoice.subtotal), styles: { halign: "right" } },
      ]),
      new Array(6).fill({ content: "" }).concat([
        {
          content: "Central Tax (9%)",
          styles: { fontStyle: "bold", halign: "right" },
        },
        { content: format(invoice.cgst_amount), styles: { halign: "right" } },
      ]),
      new Array(6).fill({ content: "" }).concat([
        {
          content: "State Tax (9%)",
          styles: { fontStyle: "bold", halign: "right" },
        },
        { content: format(invoice.sgst_amount), styles: { halign: "right" } },
      ]),
      new Array(6).fill({ content: "" }).concat([
        {
          content: "Total GST",
          styles: { fontStyle: "bold", halign: "right" },
        },
        {
          content: format(+invoice.cgst_amount + +invoice.sgst_amount),
          styles: { halign: "right" },
        },
      ]),
      new Array(6).fill({ content: "" }).concat([
        {
          content: "Transport Charges",
          styles: { fontStyle: "bold", halign: "right" },
        },
        {
          content: format(invoice.transport_charge),
          styles: { halign: "right" },
        },
      ]),
      new Array(6).fill({ content: "" }).concat([
        {
          content: "Total Amount",
          styles: { fontStyle: "bold", halign: "right" },
        },
        {
          content: format(invoice.total_amount),
          styles: { halign: "right" },
        },
      ]),
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 6: { cellWidth: 60 }, 7: { cellWidth: 35 } },
    tableLineColor: 100,
    tableLineWidth: 0.4,
  });

  // Amount in Words
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 2,
    margin: { left: 14, right: 14 },
    body: [
      [
        {
          content: `Amount Chargeable (in words): INR ${numberToWords(
            invoice.total_amount
          )}`,
          colSpan: 10,
          styles: {
            fontStyle: "bold",
            halign: "right",
            textColor: "#313030",
          },
        },
      ],
      [
        {
          content: `Tax Amount (in words): INR ${numberToWords(
            (+invoice.cgst_amount || 0) + (+invoice.sgst_amount || 0)
          )}`,
          colSpan: 10,
          styles: { halign: "right", textColor: "#313030" },
        },
      ],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2 },
    tableLineColor: 100,
    tableLineWidth: 0.4,
  });

  // Bank Details Section
  const sectionWidth = pageWidth - 28;
  let bankY = doc.lastAutoTable.finalY + 4;
  const bankHeight = 7 * 5 + 8;
  if (bankY + bankHeight > pageHeight - 30) {
    doc.addPage();
    bankY = 20;
  }

  autoTable(doc, {
    startY: bankY,
    margin: { left: 14, right: 14 },
    body: [
      [
        {
          content: `Company's Bank Details\n\nA/c Name : ${companyInfo.name}\nBank Name : ${companyInfo.bankName}\nA/c No : ${companyInfo.accountNo}\nBranch : ${companyInfo.branch}\nIFSC Code : ${companyInfo.ifsc}`,
          styles: {
            fontSize: 10,
            halign: "left",
            fontStyle: "bold",
            lineWidth: 0.2,
            lineColor: [180, 180, 180],
            fillColor: [245, 245, 245],
            textColor: [50, 50, 50],
            cellPadding: 4,
          },
        },
      ],
    ],
    columnStyles: { 0: { cellWidth: sectionWidth } },
    theme: "grid",
  });

  // Declaration Section
  let declarationY = doc.lastAutoTable.finalY + 4;
  const declarationHeight = 7 * 5 + 8;
  if (declarationY + declarationHeight > pageHeight - 30) {
    doc.addPage();
    declarationY = 20;
  }

  autoTable(doc, {
    startY: declarationY,
    margin: { left: 14, right: 14 },
    body: [
      [
        {
          content: `Declaration:\n\nWe declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\nGoods once sold will not be taken back or exchanged.\n\nSubject to Erode Jurisdiction only.`,
          styles: {
            fontSize: 10,
            halign: "left",
            fontStyle: "bold",
            lineWidth: 0.2,
            lineColor: [180, 180, 180],
            fillColor: [255, 255, 255],
            textColor: [60, 60, 60],
            cellPadding: 4,
          },
        },
      ],
    ],
    columnStyles: { 0: { cellWidth: sectionWidth } },
    theme: "grid",
  });

  // Signature Box
  let signatureY = doc.lastAutoTable.finalY + 10;
  const boxWidth = 80;
  const boxHeight = 35;
  const boxX = pageWidth - 14 - boxWidth;
  if (signatureY + boxHeight > pageHeight * 0.7) {
    doc.addPage();
    signatureY = 20;
  }

  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.2);
  doc.roundedRect(boxX, signatureY, boxWidth, boxHeight, 0, 0);
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text(`For ${companyInfo.name}`, boxX + boxWidth / 2, signatureY + 10, {
    align: "center",
  });
  doc.setDrawColor(180);
  doc.line(boxX + 10, signatureY + 22, boxX + boxWidth - 10, signatureY + 22);
  doc.text("Authorized Signatory", boxX + boxWidth / 2, signatureY + 30, {
    align: "center",
  });

  // Add page borders and footer
  addPageBorders(doc, pageWidth, pageHeight, invoice);
}

/**
 * Add page borders and footer to all pages
 */
function addPageBorders(doc, pageWidth, pageHeight, invoice) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(80);
    doc.setLineWidth(0.3);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 18);
    doc.setDrawColor(180);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `Page ${i} of ${pageCount} | Invoice No: ${invoice.invoice_number || "-"}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }
}