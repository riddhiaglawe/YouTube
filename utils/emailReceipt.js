// Email Receipt & Invoice Generator Utility

export function generateInvoiceHTML(transaction, user) {
  const formattedAmount = (transaction.amount / 100).toFixed(2);
  const startDate = new Date(transaction.startDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const expiryDate = new Date(transaction.expiryDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - Invoice ${transaction.invoiceNumber}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; color: #18181b; }
    .invoice-card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e4e4e7; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f4f4f5; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 24px; font-weight: 800; color: #dc2626; display: flex; align-items: center; gap: 8px; }
    .badge { background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 13px; }
    .label { font-weight: 600; color: #71717a; text-transform: uppercase; font-size: 11px; margin-bottom: 4px; }
    .value { font-weight: 700; color: #18181b; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .table th { text-align: left; background: #f4f4f5; padding: 10px; font-size: 12px; color: #52525b; text-transform: uppercase; }
    .table td { padding: 12px 10px; border-bottom: 1px solid #f4f4f5; font-size: 13px; font-weight: 600; }
    .total-row { background: #fafafa; font-size: 16px; font-weight: 800; }
    .footer { text-align: center; border-top: 1px solid #f4f4f5; pt: 20px; margin-top: 24px; font-size: 12px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div class="brand">▶ YourTube VIP</div>
      <div class="badge">Payment Successful</div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 18px; color: #18181b;">Official Subscription Receipt</h2>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #71717a;">Thank you for subscribing to YourTube VIP Premium Membership.</p>
    </div>

    <div class="details-grid">
      <div>
        <div class="label">Invoice Number</div>
        <div class="value">${transaction.invoiceNumber}</div>
      </div>
      <div>
        <div class="label">Payment ID</div>
        <div class="value" style="font-family: monospace;">${transaction.paymentId}</div>
      </div>
      <div>
        <div class="label">Billed To</div>
        <div class="value">${user?.name || "Valued Subscriber"} (${user?.email || "customer@example.com"})</div>
      </div>
      <div>
        <div class="label">Payment Date</div>
        <div class="value">${startDate}</div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Billing Cycle</th>
          <th>Validity Period</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${transaction.plan.toUpperCase()} Membership Plan</strong></td>
          <td>${transaction.billingCycle}</td>
          <td>${startDate} &rarr; ${expiryDate}</td>
          <td style="text-align: right;">₹${formattedAmount}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3">Total Paid</td>
          <td style="text-align: right; color: #dc2626;">₹${formattedAmount} ${transaction.currency}</td>
        </tr>
      </tbody>
    </table>

    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px; font-size: 12px; color: #1e40af; margin-bottom: 20px;">
      💡 <strong>Automated Premium Activation:</strong> Your ${transaction.plan.toUpperCase()} plan features (unlimited downloads, HD streaming, ad-free viewing, and priority queue) are now active on your account!
    </div>

    <div class="footer">
      <p>Questions or support? Contact us at <a href="mailto:support@yourtube.com" style="color: #dc2626;">support@yourtube.com</a></p>
      <p>YourTube Inc. &bull; 100% Secure Razorpay Test Encrypted Transaction</p>
    </div>
  </div>
</body>
</html>
  `;
}
