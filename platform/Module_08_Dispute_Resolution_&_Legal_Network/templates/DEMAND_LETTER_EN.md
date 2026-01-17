# Demand Letter Template (English)

**Template Code:** DEMAND_LETTER_EN  
**Type:** Demand Letter  
**Language:** English

---

## Template Content

```handlebars
FINAL DEMAND LETTER

Date: {{currentDate}}
Ref: {{referenceNumber}}

To:
{{customerName}}
{{customerAddress}}
{{customerCity}}, {{customerState}} - {{customerPincode}}

**SUBJECT: FINAL DEMAND FOR PAYMENT - {{uppercase invoiceNumber}}**

Dear {{customerName}},

This letter serves as a **FINAL DEMAND** for immediate payment of the outstanding amount due to {{companyName}}.

**PAYMENT DETAILS:**

| Description | Amount |
|-------------|--------|
| Invoice Number | {{invoiceNumber}} |
| Invoice Date | {{formatDate invoiceDate}} |
| Original Amount | {{currency invoiceAmount}} |
{{#if interestAmount}}
| Interest Charges | {{currency interestAmount}} |
{{/if}}
{{#if lateFees}}
| Late Payment Fees | {{currency lateFees}} |
{{/if}}
| **TOTAL AMOUNT DUE** | **{{currency totalDue}}** |

**PAYMENT HISTORY:**

- Due Date: {{formatDate dueDate}}
- Days Overdue: {{overdueDays}} days
- Previous Reminders Sent: {{reminderCount}}
- Last Reminder Date: {{formatDate lastReminderDate}}

**THIS IS YOUR FINAL OPPORTUNITY** to settle this matter amicably without legal intervention.

**PAYMENT DEADLINE:** {{formatDate paymentDeadline}}  
**Payment must be received within {{paymentDays}} days from the date of this letter.**

**PAYMENT METHODS:**

1. **Bank Transfer:**
   - Account Name: {{bankAccountName}}
   - Account Number: {{bankAccountNumber}}
   - IFSC Code: {{bankIFSC}}
   - Bank Name: {{bankName}}

2. **UPI:** {{upiId}}

3. **Cheque/Demand Draft:**
   Payable to "{{companyName}}" at {{companyAddress}}

**Please quote Invoice Number {{invoiceNumber}} as reference in all payments.**

**CONSEQUENCES OF NON-PAYMENT:**

If payment is not received by {{formatDate paymentDeadline}}, we will be compelled to:

1. Report this default to credit bureaus, affecting your credit score
2. Initiate legal proceedings for recovery
3. File a complaint with MSME Samadhaan portal
4. Claim additional costs including:
   - Legal fees
   - Court fees
   - Collection costs
   - Continued interest charges

**We strongly urge you to avoid these consequences by settling the outstanding amount immediately.**

Should you have any queries regarding this demand or wish to discuss a payment arrangement, please contact us within 3 business days.

This letter is issued without prejudice to our rights and remedies, all of which are expressly reserved.

Yours sincerely,

For {{companyName}}

{{authorizedSignatory}}
{{signatoryDesignation}}
Contact: {{companyContact}}
Email: {{companyEmail}}

---
**Note:** This is a computer-generated demand letter. Please respond within the stipulated time to avoid legal action.
```

---

## Variables

```json
{
  "variables": [
    { "name": "referenceNumber", "type": "string", "required": true, "description": "Demand letter reference number" },
    { "name": "customerName", "type": "string", "required": true, "description": "Customer name" },
    { "name": "customerAddress", "type": "string", "required": true, "description": "Customer address" },
    { "name": "customerCity", "type": "string", "required": true, "description": "City" },
    { "name": "customerState", "type": "string", "required": true, "description": "State" },
    { "name": "customerPincode", "type": "string", "required": true, "description": "Pincode" },
    { "name": "companyName", "type": "string", "required": true, "description": "Company name" },
    { "name": "companyAddress", "type": "string", "required": true, "description": "Company address" },
    { "name": "companyContact", "type": "string", "required": true, "description": "Company phone" },
    { "name": "companyEmail", "type": "string", "required": true, "description": "Company email" },
    { "name": "invoiceNumber", "type": "string", "required": true, "description": "Invoice number" },
    { "name": "invoiceDate", "type": "date", "required": true, "description": "Invoice date" },
    { "name": "invoiceAmount", "type": "number", "required": true, "description": "Original amount" },
    { "name": "totalDue", "type": "number", "required": true, "description": "Total due" },
    { "name": "interestAmount", "type": "number", "required": false, "description": "Interest" },
    { "name": "lateFees", "type": "number", "required": false, "description": "Late fees" },
    { "name": "overdueDays", "type": "number", "required": true, "description": "Days overdue" },
    { "name": "dueDate", "type": "date", "required": true, "description": "Original due date" },
    { "name": "reminderCount", "type": "number", "required": true, "description": "Number of reminders sent" },
    { "name": "lastReminderDate", "type": "date", "required": true, "description": "Last reminder date" },
    { "name": "paymentDays", "type": "number", "required": true, "description": "Days to pay (e.g., 7)" },
    { "name": "paymentDeadline", "type": "date", "required": true, "description": "Final payment deadline" },
    { "name": "bankAccountName", "type": "string", "required": true, "description": "Bank account name" },
    { "name": "bankAccountNumber", "type": "string", "required": true, "description": "Account number" },
    { "name": "bankIFSC", "type": "string", "required": true, "description": "IFSC code" },
    { "name": "bankName", "type": "string", "required": true, "description": "Bank name" },
    { "name": "upiId", "type": "string", "required": false, "description": "UPI ID" },
    { "name": "authorizedSignatory", "type": "string", "required": true, "description": "Signatory name" },
    { "name": "signatoryDesignation", "type": "string", "required": true, "description": "Signatory designation" }
  ]
}
```
