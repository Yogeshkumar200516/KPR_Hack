import pdfMakeModule from "pdfmake/build/pdfmake";
import pdfFontsModule from "pdfmake/build/vfs_fonts";

pdfMakeModule.vfs = pdfMake.vfs;

// Utility to convert image URL to base64 Data URL asynchronously
const toBase64Image = (imgUrl) => {
  return new Promise((resolve) => {
    if (!imgUrl) return resolve(null);
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Enable CORS for cross-origin images

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      } catch (err) {
        console.error("Canvas conversion error:", err);
        resolve(null);
      }
    };

    img.onerror = (err) => {
      console.error("Image load error for URL:", imgUrl, err);
      resolve(null);
    };

    img.src = imgUrl;
  });
};

// Utility function to format currency
const formatCurrency = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
};

export const generateBillPDF = async (bill) => {
  if (!bill) return;

  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const pdfFonts = pdfFontsModule.default || pdfFontsModule;
  pdfMake.vfs = pdfFonts.vfs;

  const formattedDate = bill.created_at
    ? new Date(bill.created_at).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const company = bill.company || {};

  // Construct full logo URL for base64 conversion (replace with your actual base URL)
  let logoDataUrl = null;
  if (company.logo) {
    const baseImageUrl = "https://yourdomain.com/uploads/"; // Change this to your image hosting URL
    const fullLogoUrl = baseImageUrl + company.logo;
    logoDataUrl = await toBase64Image(fullLogoUrl);
  }

  // Build product table body
  const tableBody = [
    [
      { text: "Product", bold: true, fillColor: "#4a90e2", color: "#fff" },
      { text: "HSN", bold: true, fillColor: "#4a90e2", color: "#fff" },
      { text: "Qty", bold: true, alignment: "right", fillColor: "#4a90e2", color: "#fff" },
      { text: "Unit", bold: true, fillColor: "#4a90e2", color: "#fff" },
      { text: "Rate", bold: true, alignment: "right", fillColor: "#4a90e2", color: "#fff" },
      { text: "GST%", bold: true, alignment: "right", fillColor: "#4a90e2", color: "#fff" },
      { text: "Discount", bold: true, alignment: "right", fillColor: "#4a90e2", color: "#fff" },
      { text: "Base Amt", bold: true, alignment: "right", fillColor: "#4a90e2", color: "#fff" },
      { text: "Total (incl GST)", bold: true, alignment: "right", fillColor: "#4a90e2", color: "#fff" },
    ],
  ];

  if (bill.items && bill.items.length > 0) {
    bill.items.forEach((item, index) => {
      const rowFillColor = index % 2 === 0 ? "#f3f6fb" : "#eaf1fb";
      tableBody.push([
        { text: item.product_name || "-", fillColor: rowFillColor },
        { text: item.hsn_code || "-", fillColor: rowFillColor },
        { text: item.quantity?.toString() || "0", alignment: "right", fillColor: rowFillColor },
        { text: item.unit || "-", fillColor: rowFillColor },
        { text: `₹${formatCurrency(item.rate)}`, alignment: "right", fillColor: rowFillColor },
        { text: `${item.gst_percentage || 0}%`, alignment: "right", fillColor: rowFillColor },
        { text: `${item.discount || 0}%`, alignment: "right", fillColor: rowFillColor },
        { text: `₹${formatCurrency(item.base_amount)}`, alignment: "right", fillColor: rowFillColor },
        { text: `₹${formatCurrency(item.total_with_gst)}`, alignment: "right", bold: true, fillColor: rowFillColor },
      ]);
    });
  } else {
    tableBody.push([{ text: "No products to display", colSpan: 10, alignment: "center", italics: true }, {}, {}, {}, {}, {}, {}, {}, {}, {}]);
  }

  const docDefinition = {
    pageSize: "A5",
    pageOrientation: "landscape",
    pageMargins: [15, 15, 15, 15],
    info: {
      title: `Bill_${bill.bill_number || "unknown"}`,
      author: company.name || "Your Company",
      subject: "Bill PDF",
      keywords: "bill, pdf",
    },
    content: [
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  {
                    columns: [
                      logoDataUrl
                        ? { image: logoDataUrl, width: 60, margin: [0, 0, 10, 0] }
                        : { text: "" },
                      {
                        stack: [
                          { text: company.name || "Your Company Name", style: "companyName" },
                          { text: company.address || "", style: "companyDetails" },
                          { text: `Mob: ${company.mobile1 || ""}${company.mobile2 ? ", " + company.mobile2 : ""}`, style: "companyDetails" },
                          { text: `GST: ${company.gst_no || ""}`, style: "companyDetails" },
                        ],
                        alignment: "left",
                      },
                    ],
                    columnGap: 10,
                    margin: [0, 0, 0, 10],
                  },
                  { text: "BILL", style: "header", alignment: "center", margin: [0, 0, 0, 10] },
                  {
                    columns: [
                      { text: `Bill Number: ${bill.bill_number || "-"}`, style: "subheader" },
                      { text: `Date: ${formattedDate}`, style: "subheader", alignment: "right" },
                    ],
                    margin: [0, 0, 0, 10],
                  },
                  {
                    table: {
                      widths: ["*"],
                      body: [
                        [
                          {
                            stack: [
                              { text: "Customer Information", style: "sectionHeader" },
                              { text: `Name: ${bill.customer_name || "-"}` },
                              { text: `Mobile: ${bill.mobile_no || "-"}` },
                            ],
                          },
                        ],
                      ],
                    },
                    layout: {
                      hLineWidth: () => 1,
                      vLineWidth: () => 1,
                      hLineColor: () => "#4a90e2",
                      vLineColor: () => "#4a90e2",
                      paddingLeft: () => 8,
                      paddingRight: () => 8,
                      paddingTop: () => 8,
                      paddingBottom: () => 8,
                    },
                    margin: [0, 0, 0, 10],
                  },
                  { text: "Product Details", style: "sectionHeader", margin: [0, 0, 0, 5] },
                  {
                    table: {
                      headerRows: 1,
                      widths: [80, 40, 30, 40, 50, 40, 50, 60, 70, "*"],
                      body: tableBody,
                    },
                    layout: {
                      hLineColor: () => "#a0c4ff",
                      vLineColor: () => "#a0c4ff",
                      fillColor: (rowIndex) => (rowIndex % 2 === 0 ? "#f7faff" : null),
                      paddingLeft: () => 5,
                      paddingRight: () => 5,
                      paddingTop: () => 4,
                      paddingBottom: () => 4,
                    },
                    margin: [0, 0, 0, 10],
                  },
                  {
                    table: {
                      widths: ["50%", "50%"],
                      body: [
                        [
                          {
                            stack: [
                              { text: `Subtotal: ₹${formatCurrency(bill.subtotal)}`, alignment: "right" },
                              { text: `Discount (${bill.discount_type === "%" ? "%" : "₹"}): ₹${formatCurrency(bill.discount_value)}`, alignment: "right" },
                              bill.transport_charge > 0 && { text: `Transport Charges: ₹${formatCurrency(bill.transport_charge)}`, alignment: "right" },
                              { text: `Total Amount: ₹${formatCurrency(bill.total_amount)}`, alignment: "right", bold: true },
                            ].filter(Boolean),
                          },
                          {
                            stack: [
                              bill.gst_amount > 0 && { text: `GST (${bill.gst_percentage}%): ₹${formatCurrency(bill.gst_amount)}`, alignment: "right" },
                              bill.gst_amount > 0 && { text: `CGST: ₹${formatCurrency(bill.cgst_amount)}`, alignment: "right" },
                              bill.gst_amount > 0 && { text: `SGST: ₹${formatCurrency(bill.sgst_amount)}`, alignment: "right" },
                            ].filter(Boolean),
                          },
                        ],
                      ],
                    },
                    layout: {
                      hLineColor: () => "#b0c4de",
                      vLineColor: () => "#b0c4de",
                      paddingLeft: () => 8,
                      paddingRight: () => 8,
                      paddingTop: () => 6,
                      paddingBottom: () => 6,
                    },
                    margin: [0, 0, 0, 10],
                  },
                  {
                    table: {
                      widths: ["*"],
                      body: [
                        [
                          {
                            stack: [
                              { text: "Payment Details", style: "sectionHeader" },
                              { text: `Payment Mode: ${bill.payment_type || "N/A"}` },
                              { text: `Payment Status: ${bill.payment_status || "N/A"}` },
                              { text: `Advance Amount: ₹${formatCurrency(bill.advance_amount)}` },
                              { text: `Balance Amount: ₹${formatCurrency(bill.total_amount - bill.advance_amount)}`, bold: true },
                            ],
                          },
                        ],
                      ],
                    },
                    layout: {
                      hLineWidth: () => 1,
                      vLineWidth: () => 1,
                      hLineColor: () => "#4a90e2",
                      vLineColor: () => "#4a90e2",
                      paddingLeft: () => 8,
                      paddingRight: () => 8,
                      paddingTop: () => 8,
                      paddingBottom: () => 8,
                    },
                    margin: [0, 0, 0, 10],
                  },
                ],
                layout: {
                  hLineWidth: () => 2,
                  vLineWidth: () => 2,
                  hLineColor: () => "#3e64ff",
                  vLineColor: () => "#3e64ff",
                  paddingLeft: () => 8,
                  paddingRight: () => 8,
                  paddingTop: () => 8,
                  paddingBottom: () => 8,
                },
              },
            ],
          ],
        },
      },
    ],
    styles: {
      header: { fontSize: 24, bold: true, color: "#3e64ff" },
      subheader: { fontSize: 12, margin: [0, 2, 0, 4], color: "#666" },
      sectionHeader: { fontSize: 16, bold: true, margin: [0, 5, 0, 10], color: "#4a90e2" },
      companyName: { fontSize: 18, bold: true, color: "#3e64ff" },
      companyDetails: { fontSize: 11, color: "#555" },
      balance: { fontSize: 16, bold: true, color: "#d1495b" },
    },
    defaultStyle: {
      fontSize: 10,
    },
  };

  pdfMake.createPdf(docDefinition).download(`Bill_${bill.bill_number || "unknown"}.pdf`);
};
