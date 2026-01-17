# Invoice Management - User Guide

## 📋 Overview

The Invoice Management module allows you to create, track, and manage invoices for your customers. This guide will help you understand all features and workflows.

---

## 🚀 Quick Start

### Creating Your First Invoice

1. Navigate to **Invoice Management** from the sidebar
2. Click **+ Create Invoice** button
3. Fill in customer details
4. Add line items (products/services)
5. Review and click **Generate Invoice**
6. Invoice is sent automatically via email

---

## 📊 Dashboard Overview

### Key Metrics

**Total Invoices**: All invoices created  
**Pending**: Awaiting payment  
**Paid**: Successfully paid  
**Overdue**: Past due date

**Revenue Trend**: Visual chart showing monthly revenue

---

## 📝 Creating Invoices

### Step-by-Step Process

**1. Customer Information**
- Select existing customer or add new
- Verify billing address
- Add customer email for notifications

**2. Invoice Details**
- Invoice number (auto-generated)
- Issue date
- Due date
- Payment terms (Net 30, Net 60, etc.)

**3. Line Items**
- Product/Service name
- Description
- Quantity
- Unit price
- Tax rate (if applicable)
- Total (calculated automatically)

**4. Additional Options**
- Add notes/payment instructions
- Attach supporting documents
- Set up recurring invoice
- Apply discounts

**5. Review & Send**
- Preview invoice PDF
- Verify all information
- Send via email automatically
- Download PDF copy

---

## 🔍 Managing Invoices

### Invoice List View

**Filters Available**:
- Status (Pending, Paid, Overdue)
- Date range
- Customer name
- Amount range

**Actions**:
- **View**: See full invoice details
- **Edit**: Modify draft invoices
- **Send Reminder**: Email payment reminder
- **Mark as Paid**: Manual payment recording
- **Download PDF**: Save invoice copy
- **Delete**: Remove invoice (draft only)

### Invoice Status

**Draft**: Being created, not sent  
**Sent**: Delivered to customer  
**Viewed**: Customer opened email  
**Pending**: Awaiting payment  
**Paid**: Payment received  
**Overdue**: Past due date  
**Cancelled**: Invoice void

---

## 🔄 Recurring Invoices

### Setup

1. Create invoice as normal
2. Enable "Recurring Invoice" toggle
3. Set frequency:
   - Weekly
   - Monthly
   - Quarterly
   - Annually
4. Set end date or number of occurrences
5. System generates automatically

### Managing Recurring

- View all recurring schedules
- Pause/resume recurring
- Edit template
- Cancel recurring series
- View generated invoices

---

## 💰 Payment Tracking

### Recording Payments

**Automatic** (via payment gateway):
- Payment gateway sends webhook
- Invoice auto-marked as paid
- Customer receives confirmation
- Books updated

**Manual**:
1. Open invoice
2. Click **Record Payment**
3. Enter:
   - Payment amount
   - Payment date
   - Payment method
   - Reference number
4. Upload proof (optional)
5. Save

### Partial Payments

- Record multiple payments
- Track outstanding balance
- Auto-update status
- Send balance reminder

---

## 📧 Notifications

### Automatic Emails

**Invoice Created**: Sent to customer  
**Payment Reminder**: 7 days before due  
**Overdue Notice**: Day after due date  
**Payment Received**: Confirmation  

### Customization

- Edit email templates
- Add company logo
- Customize message
- Set reminder schedule

---

## 📊 Reports

### Available Reports

**Invoice Summary**:
- Total invoiced
- Total paid
- Outstanding balance
- Average days to payment

**Aging Report**:
- 0-30 days
- 31-60 days
- 61-90 days
- 90+ days

**Customer Report**:
- Total invoiced per customer
- Payment history
- Average payment time

**Revenue Report**:
- Monthly revenue
- Year-over-year comparison
- Revenue by product/service

### Exporting

- Export to Excel
- Export to PDF
- Export to CSV
- Schedule automated reports

---

## 🔧 Settings

### Invoice Configuration

**Numbering**:
- Prefix (e.g., INV-)
- Starting number
- Number format

**Terms**:
- Default payment terms
- Late payment penalty
- Early payment discount

**Tax**:
- Default tax rate
- Tax included/excluded
- Multiple tax rates

**Branding**:
- Company logo
- Color scheme
- Custom footer
- Payment instructions

---

## ❓ Common Questions

**Q: How do I edit a sent invoice?**  
A: Create a credit note and issue a new invoice.

**Q: Can I accept online payments?**  
A: Yes, integrate payment gateway in Settings.

**Q: What if customer doesn't receive invoice?**  
A: Resend from invoice details page or download and send manually.

**Q: How do I handle foreign currency?**  
A: Enable multi-currency in Settings, then select currency when creating invoice.

**Q: Can I batch send invoices?**  
A: Yes, select multiple invoices and click "Send Selected".

---

## 💡 Best Practices

1. **Set Clear Payment Terms**: Specify due dates clearly
2. **Send Promptly**: Send invoices immediately after service
3. **Follow Up**: Send reminders before and after due date
4. **Keep Records**: Download and backup all invoices
5. **Review Regularly**: Check aging report weekly

---

## 🆘 Troubleshooting

**Invoice not sending?**
- Check customer email address
- Verify email settings in Settings
- Check spam folder

**Payment not reflecting?**
- Verify payment gateway webhook configured
- Check payment integration logs
- Record payment manually if needed

**Numbers not calculating?**
- Refresh page
- Clear browser cache
- Check tax configuration

---

## 📞 Support

Need help? Contact support:
- **Email**: support@smeplatform.com
- **Phone**: +1-XXX-XXX-XXXX
- **Chat**: Available in dashboard

---

*Invoice Management User Guide v1.0*  
*Last Updated: December 14, 2025*
