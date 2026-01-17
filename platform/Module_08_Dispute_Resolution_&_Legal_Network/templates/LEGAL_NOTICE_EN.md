# Legal Notice Template (English)

**Template Code:** LEGAL_NOTICE_EN  
**Type:** Legal Notice  
**Language:** English

---

## Template Content

```handlebars
LEGAL NOTICE

Date: {{currentDate}}

To:
{{customerName}}
{{customerAddress}}
{{customerCity}}, {{customerState}} - {{customerPincode}}

Subject: Legal Notice for Recovery of Outstanding Amount - Invoice No. {{invoiceNumber}}

Dear Sir/Madam,

This is a legal notice issued on behalf of our client {{companyName}} (hereinafter referred to as "the Client") having its registered office at {{companyAddress}}, in the matter of outstanding payment against Invoice No. {{invoiceNumber}} dated {{invoiceDate}}.

**BRIEF FACTS OF THE CASE:**

1. The Client had provided goods/services to you as per the terms and conditions agreed upon between the parties.

2. Against the said goods/services, an invoice bearing number {{invoiceNumber}} dated {{invoiceDate}} was raised for an amount of {{currency invoiceAmount}}.

3. As per the agreed payment terms, the payment was due on {{dueDate}}.

4. Despite repeated requests, reminders, and follow-ups, you have failed to make the payment.

5. The total outstanding amount as of today is {{currency totalDue}}, which includes:
   - Principal Amount: {{currency invoiceAmount}}
   {{#if interestAmount}}
   - Interest Charges: {{currency interestAmount}}
   {{/if}}
   {{#if lateFees}}
   - Late Payment Fees: {{currency lateFees}}
   {{/if}}

6. The payment is overdue by {{overdueDays}} days from the due date.

**LEGAL NOTICE:**

You are hereby called upon to pay the outstanding amount of {{currency totalDue}} within {{noticePeriod}} days from the date of receipt of this notice, failing which our client shall be constrained to initiate appropriate legal proceedings against you for recovery of the outstanding amount along with interest and costs.

Please note that if legal action becomes necessary, you shall be liable to pay all legal costs, court fees, and additional charges as per law.

This notice is issued without prejudice to all rights, claims, and contentions of our client, all of which are expressly reserved.

You are advised to treat this matter with utmost urgency to avoid legal consequences.

Yours faithfully,

{{legalProviderName}}
{{legalProviderDesignation}}
Bar Council Enrollment No.: {{legalProviderBarNumber}}
{{legalProviderAddress}}
{{legalProviderContact}}

On behalf of:
{{companyName}}
```

---

## Variables

```json
{
  "variables": [
    { "name": "customerName", "type": "string", "required": true, "description": "Customer/Debtor name" },
    { "name": "customerAddress", "type": "string", "required": true, "description": "Customer address line" },
    { "name": "customerCity", "type": "string", "required": true, "description": "Customer city" },
    { "name": "customerState", "type": "string", "required": true, "description": "Customer state" },
    { "name": "customerPincode", "type": "string", "required": true, "description": "Customer pincode" },
    { "name": "companyName", "type": "string", "required": true, "description": "Creditor company name" },
    { "name": "companyAddress", "type": "string", "required": true, "description": "Company registered address" },
    { "name": "invoiceNumber", "type": "string", "required": true, "description": "Invoice reference number" },
    { "name": "invoiceDate", "type": "date", "required": true, "description": "Invoice date" },
    { "name": "invoiceAmount", "type": "number", "required": true, "description": "Original invoice amount" },
    { "name": "dueDate", "type": "date", "required": true, "description": "Payment due date" },
    { "name": "totalDue", "type": "number", "required": true, "description": "Total amount due including charges" },
    { "name": "interestAmount", "type": "number", "required": false, "description": "Interest charges" },
    { "name": "lateFees", "type": "number", "required": false, "description": "Late payment fees" },
    { "name": "overdueDays", "type": "number", "required": true, "description": "Number of days overdue" },
    { "name": "noticePeriod", "type": "number", "required": true, "description": "Days to respond (usually 15-30)" },
    { "name": "legalProviderName", "type": "string", "required": true, "description": "Lawyer/Firm name" },
    { "name": "legalProviderDesignation", "type": "string", "required": true, "description": "Advocate/Senior Advocate" },
    { "name": "legalProviderBarNumber", "type": "string", "required": true, "description": "Bar Council number" },
    { "name": "legalProviderAddress", "type": "string", "required": true, "description": "Lawyer office address" },
    { "name": "legalProviderContact", "type": "string", "required": true, "description": "Contact details" }
  ]
}
```

---

## Usage Example

```typescript
const variables = {
  customerName: "ABC Enterprises Pvt. Ltd.",
  customerAddress: "Plot No. 45, Industrial Area",
  customerCity: "Mumbai",
  customerState: "Maharashtra",
  customerPincode: "400001",
  companyName: "XYZ Manufacturing Ltd.",
  companyAddress: "Tower A, Business Park, Mumbai - 400002",
  invoiceNumber: "INV/2025/001234",
  invoiceDate: "2024-11-01",
  invoiceAmount: 250000,
  dueDate: "2024-12-01",
  totalDue: 265000,
  interestAmount: 10000,
  lateFees: 5000,
  overdueDays: 54,
  noticePeriod: 15,
  legalProviderName: "Kumar & Associates",
  legalProviderDesignation: "Advocate",
  legalProviderBarNumber: "MH/1234/2015",
  legalProviderAddress: "Chamber No. 42, District Court Complex, Mumbai",
  legalProviderContact: "Phone: +91-22-12345678 | Email: legal@kumarassociates.com"
};
```
